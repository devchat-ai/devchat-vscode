// devchat.ts
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { logger } from '../util/logger';
import { CommandRun } from "../util/commonUtil";
import ExtensionContextHolder from '../util/extensionContext';



const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

export interface ChatOptions {
	parent?: string;
	reference?: string[];
	header?: string[];
	context?: string[];
}

export interface LogOptions {
	skip?: number;
	maxCount?: number;
}

export interface LogEntry {
	hash: string;
	parent: string;
	user: string;
	date: string;
	request: string;
	response: string;
	context: Array<{
		content: string;
		role: string;
	}>;
}

export interface ChatResponse {
	"prompt-hash": string;
	user: string;
	date: string;
	response: string;
	isError: boolean;
}


class DevChat {
	private commandRun: CommandRun;

	constructor() {
		this.commandRun = new CommandRun();
	}

	public stop() {
		this.commandRun.stop();
	}

	async buildArgs(options: ChatOptions): Promise<string[]> {
		let args = ["prompt"];

		if (options.reference) {
			for (const reference of options.reference) {
				args.push("-r", reference);
			}
		}
		if (options.header) {
			for (const header of options.header) {
				args.push("-i", header);
			}
		}
		if (options.context) {
			for (const context of options.context) {
				args.push("-c", context);
			}
		}

		if (options.parent) {
			args.push("-p", options.parent);
		}

		return args;
	}

	async getOpenaiApiKey(): Promise<string | undefined> {
		const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
		let openaiApiKey = await secretStorage.get("devchat_OPENAI_API_KEY");
		if (!openaiApiKey) {
			openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('API_KEY');
		}
		if (!openaiApiKey) {
			openaiApiKey = process.env.OPENAI_API_KEY;
		}
		return openaiApiKey;
	}

	private parseOutData(stdout: string, isPartial: boolean): ChatResponse {
		const responseLines = stdout.trim().split("\n");

		if (responseLines.length < 2) {
			return {
				"prompt-hash": "",
				user: "",
				date: "",
				response: "",
				isError: isPartial ? false : true,
			};
		}

		const userLine = responseLines.shift()!;
		const user = (userLine.match(/User: (.+)/)?.[1]) ?? "";

		const dateLine = responseLines.shift()!;
		const date = (dateLine.match(/Date: (.+)/)?.[1]) ?? "";


		let promptHashLine = "";
		for (let i = responseLines.length - 1; i >= 0; i--) {
			if (responseLines[i].startsWith("prompt")) {
				promptHashLine = responseLines[i];
				responseLines.splice(i, 1);
				break;
			}
		}

		if (!promptHashLine) {
			return {
				"prompt-hash": "",
				user: user,
				date: date,
				response: responseLines.join("\n"),
				isError: isPartial ? false : true,
			};
		}

		const promptHash = promptHashLine.split(" ")[1];
		const response = responseLines.join("\n");

		return {
			"prompt-hash": promptHash,
			user,
			date,
			response,
			isError: false,
		};
	}

	apiEndpoint(apiKey: string | undefined): any {
		let openAiApiBase: string | undefined = undefined;
		if (apiKey?.startsWith("dc-")) {
			// TODO add devchat proxy
			openAiApiBase = "";
		}

		if (vscode.workspace.getConfiguration('DevChat').get('API_ENDPOINT')) {
			openAiApiBase = vscode.workspace.getConfiguration('DevChat').get('API_ENDPOINT');
		}

		const openAiApiBaseObject = openAiApiBase ? { OPENAI_API_BASE: openAiApiBase } : {};
		return openAiApiBaseObject;
	}

	async chat(content: string, options: ChatOptions = {}, onData: (data: ChatResponse) => void): Promise<ChatResponse> {
		const args = await this.buildArgs(options);
		args.push(content);

		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		let openaiApiKey = await this.getOpenaiApiKey();
		if (!openaiApiKey) {
			logger.channel()?.error('OpenAI key is invalid!');
			logger.channel()?.show();
		}


		// 如果配置了devchat的TOKEN，那么就需要使用默认的代理
		let openAiApiBaseObject = this.apiEndpoint(openaiApiKey);

		const openaiModel = vscode.workspace.getConfiguration('DevChat').get('OpenAI.model');
		const openaiTemperature = vscode.workspace.getConfiguration('DevChat').get('OpenAI.temperature');
		const openaiStream = vscode.workspace.getConfiguration('DevChat').get('OpenAI.stream');
		const llmModel = vscode.workspace.getConfiguration('DevChat').get('llmModel');
		const tokensPerPrompt = vscode.workspace.getConfiguration('DevChat').get('OpenAI.tokensPerPrompt');

		let devChat: string | undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}

		const devchatConfig = {
			model: openaiModel,
			provider: llmModel,
			"tokens-per-prompt": tokensPerPrompt,
			OpenAI: {
				temperature: openaiTemperature,
				stream: openaiStream,
			}
		}
		// write to config file
		const configPath = path.join(workspaceDir!, '.chat', 'config.json');
		// write devchatConfig to configPath
		const configJson = JSON.stringify(devchatConfig, null, 2);
		fs.writeFileSync(configPath, configJson);

		try {

			let receviedStdout = "";
			const onStdoutPartial = (stdout: string) => {
				receviedStdout += stdout;
				const data = this.parseOutData(receviedStdout, true);
				onData(data);
			};

			const spawnAsyncOptions = {
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: workspaceDir,
				env: {
					...process.env,
					OPENAI_API_KEY: openaiApiKey,
					...openaiApiBaseObject
				},
			};

			logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
			logger.channel()?.info(`Running devchat with env: ${JSON.stringify(openAiApiBaseObject)}`);
			const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(devChat, args, spawnAsyncOptions, onStdoutPartial, undefined, undefined, undefined);

			if (stderr) {
				const errorMessage = stderr.trim().match(/Error：(.+)/)?.[1];
				return {
					"prompt-hash": "",
					user: "",
					date: "",
					response: errorMessage ? `Error: ${errorMessage}` : "Unknown error",
					isError: true,
				};
			}

			const response = this.parseOutData(stdout, false);
			return response;
		} catch (error: any) {
			return {
				"prompt-hash": "",
				user: "",
				date: "",
				response: `Error: ${error.stderr}\nExit code: ${error.code}`,
				isError: true,
			};
		}
	}

	async log(options: LogOptions = {}): Promise<LogEntry[]> {
		const args = this.buildLogArgs(options);
		const devChat = this.getDevChatPath();
		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		const openaiApiKey = process.env.OPENAI_API_KEY;

		logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				...process.env,
				OPENAI_API_KEY: openaiApiKey,
			},
		};
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(devChat, args, spawnOptions, undefined, undefined, undefined, undefined);

		logger.channel()?.info(`Finish devchat with args: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error getting log: ${stderr}`);
			logger.channel()?.show();
			return [];
		}

		return JSON.parse(stdout.trim()).reverse();
	}

	private buildLogArgs(options: LogOptions): string[] {
		let args = ["log"];

		if (options.skip) {
			args.push('--skip', `${options.skip}`);
		}
		if (options.maxCount) {
			args.push('--max-count', `${options.maxCount}`);
		} else {
			const maxLogCount = vscode.workspace.getConfiguration('DevChat').get('maxLogCount');
			args.push('--max-count', `${maxLogCount}`);
		}

		return args;
	}

	private getDevChatPath(): string {
		let devChat: string | undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}
		return devChat;
	}
}

export default DevChat;
