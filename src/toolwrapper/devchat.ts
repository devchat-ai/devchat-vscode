// devchat.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { logger } from '../util/logger';
import { CommandRun, saveModelSettings } from "../util/commonUtil";
import ExtensionContextHolder from '../util/extensionContext';
import { UiUtilWrapper } from '../util/uiUtil';
import { ApiKeyManager } from '../util/apiKey';
import { exitCode } from 'process';


const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

export interface ChatOptions {
	parent?: string;
	reference?: string[];
	header?: string[];
	functions?: string;
	role?: string;
	function_name?: string;
	context?: string[];
}

export interface LogOptions {
	skip?: number;
	maxCount?: number;
	topic?: string;
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

export interface CommandEntry {
	name: string;
	description: string;
}

// define TopicEntry interface
/*
[
	{
		root_prompt: LogEntry,
		latest_time: 1689849274,
		hidden: false,
		title: null
	}
]
*/
export interface TopicEntry {
	root_prompt: LogEntry;
	latest_time: number;
	hidden: boolean;
	title: string | null;
}

export interface ChatResponse {
	"prompt-hash": string;
	user: string;
	date: string;
	response: string;
	finish_reason: string;
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

		// TODO: fix openai function calling
		// const isEnableFunctionCalling = UiUtilWrapper.getConfiguration('DevChat', 'EnableFunctionCalling');
		// if (options.functions && isEnableFunctionCalling) {
		// 	args.push("-f", options.functions);
		// }

		if (options.function_name) {
			args.push("-n", options.function_name);
		}

		if (options.parent) {
			args.push("-p", options.parent);
		}

		const llmModelData = await ApiKeyManager.llmModel();
		if (llmModelData && llmModelData.model) {
			args.push("-m", llmModelData.model);
		}

		return args;
	}

	private parseOutData(stdout: string, isPartial: boolean): ChatResponse {
		const responseLines = stdout.trim().split("\n");

		if (responseLines.length < 2) {
			return {
				"prompt-hash": "",
				user: "",
				date: "",
				response: "",
				finish_reason: "",
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

		let finishReasonLine = "";
		for (let i = responseLines.length - 1; i >= 0; i--) {
			if (responseLines[i].startsWith("finish_reason:")) {
				finishReasonLine = responseLines[i];
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
				finish_reason: "",
				isError: isPartial ? false : true,
			};
		}

		const finishReason = finishReasonLine.split(" ")[1];
		const promptHash = promptHashLine.split(" ")[1];
		const response = responseLines.join("\n");

		return {
			"prompt-hash": promptHash,
			user,
			date,
			response,
			finish_reason: finishReason,
			isError: false,
		};
	}

	async chat(content: string, options: ChatOptions = {}, onData: (data: ChatResponse) => void): Promise<ChatResponse> {
		const llmModelData = await ApiKeyManager.llmModel();
		if (!llmModelData) {
			return {
				"prompt-hash": "",
				user: "",
				date: "",
				response: `Error: no valid llm model is selected!`,
				finish_reason: "",
				isError: true,
			};
		}

		const args = await this.buildArgs(options);
		args.push("--");
		args.push(content);

		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		let openaiApiKey = await ApiKeyManager.getApiKey();
		if (!openaiApiKey) {
			logger.channel()?.error('The OpenAI key is invalid!');
			logger.channel()?.show();
		}

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const openAiApiBaseObject = llmModelData.api_base? { OPENAI_API_BASE: llmModelData.api_base } : {};
		const activeLlmModelKey = llmModelData.api_key;

		let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}

		await saveModelSettings();

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
					PYTHONUTF8:1,
					PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
					...process.env,
					OPENAI_API_KEY: activeLlmModelKey,
					...openAiApiBaseObject
				},
			};

			// activeLlmModelKey is an api key, I will output it to the log
			// so, replace mid-sub string with *
			// for example: sk-1234567890 -> sk-1*****7890, keep first 4 char and last 4 char visible
			const newActiveLlmModelKey = activeLlmModelKey.replace(/^(.{4})(.*)(.{4})$/, (_, first, middle, last) => first + middle.replace(/./g, '*') + last);
			const keyInfo = {
				OPENAI_API_KEY: newActiveLlmModelKey ,
					...openAiApiBaseObject
			};
			const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";

			logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
			logger.channel()?.info(`Running devchat with environment: ${JSON.stringify(keyInfo)}`);
			const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnAsyncOptions, onStdoutPartial, undefined, undefined, undefined);

			if (stderr) {
				let newStderr = stderr;
				if (stderr.indexOf('Failed to verify access key') > 0) {
					newStderr += `\nPlease check your key data: ${JSON.stringify(keyInfo)}`;
				}
				return {
					"prompt-hash": "",
					user: "",
					date: "",
					response: newStderr,
					finish_reason: "",
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
				finish_reason: "",
				isError: true,
			};
		}
	}

	async logInsert(request: string, response: string, parent: string | undefined) {
		let log_data = {
			"model": "gpt-4",
			"messages": [
				{
					"role": "user",
					"content": request
				},
				{
					"role": "assistant",
					"content": response
				}
			],
			"timestamp": Math.floor(Date.now()/1000),
			"request_tokens": 1,
			"response_tokens": 1
		};
		if (parent) {
			log_data["parent"] = parent;
		}

		
		const args = ["log", "--insert", JSON.stringify(log_data)];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		const openaiApiKey = process.env.OPENAI_API_KEY;

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
				OPENAI_API_KEY: openaiApiKey,
			},
		};
		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);

		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
			return false;
		}
		if (stdout.indexOf('Failed to insert log') >= 0) {
			logger.channel()?.error(`Failed to insert log: ${log_data}`);
			logger.channel()?.show();
			return false;
		}

		if (code !== 0) {
			logger.channel()?.error(`Exit code: ${code}`);
			logger.channel()?.show();
			return false;
		}
		return true;
	}

	async delete(hash: string): Promise<boolean> {
		const args = ["log", "--delete", hash];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		const openaiApiKey = process.env.OPENAI_API_KEY;

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
				OPENAI_API_KEY: openaiApiKey,
			},
		};
		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);

		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
			return false;
		}
		if (stdout.indexOf('Failed to delete prompt') >= 0) {
			logger.channel()?.error(`Failed to delete prompt: ${hash}`);
			logger.channel()?.show();
			return false;
		}

		if (code !== 0) {
			logger.channel()?.error(`Exit code: ${code}`);
			logger.channel()?.show();
			return false;
		}
		return true;
	}

	async log(options: LogOptions = {}): Promise<LogEntry[]> {
		const args = this.buildLogArgs(options);
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		const openaiApiKey = process.env.OPENAI_API_KEY;

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
				OPENAI_API_KEY: openaiApiKey,
			},
		};
		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);

		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
			return [];
		}

		const logs = JSON.parse(stdout.trim()).reverse();
		for (const log of logs) {
			log.response = log.responses[0];
			delete log.responses;
		}
		return logs;
	}

	// command devchat run --list
	// output:
	// [
	// 	{
	// 	"name": "code",
	// 	"description": "Generate code with a general template embedded into the prompt."
	// 	},
	// 	{
	// 	"name": "code.py",
	// 	"description": "Generate code with a Python-specific template embedded into the prompt."
	// 	},
	// 	{
	// 	"name": "commit_message",
	// 	"description": "Generate a commit message for the given git diff."
	// 	},
	// 	{
	// 	"name": "release_note",
	// 	"description": "Generate a release note for the given commit log."
	// 	}
	// ]
	async commands(): Promise<CommandEntry[]> {
		const args = ["run", "--list"];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
			},
		};

		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);
		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
			return [];
		}

		try {
			const commands = JSON.parse(stdout.trim());
			return commands;
		} catch (error) {
			logger.channel()?.error(`Error parsing JSON: ${error}`);
			logger.channel()?.show();
			return [];
		}
	}

	async commandPrompt(command: string): Promise<string> {
		const args = ["run", command];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
			},
		};

		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);
		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
		}
		return stdout;
	}

	async updateSysCommand(): Promise<string> {
		const args = ["run", "--update-sys"];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();

		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
			},
		};

		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);
		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
		}
		logger.channel()?.info(`${stdout}`);
		return stdout;
	}

	async topics(): Promise<TopicEntry[]> {
		const args = ["topic", "-l"];
		const devChat = this.getDevChatPath();
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		
		logger.channel()?.info(`Running devchat with arguments: ${args.join(" ")}`);
		const spawnOptions = {
			maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
			cwd: workspaceDir,
			env: {
				PYTHONUTF8:1,
				PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
				...process.env,
			},
		};

		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3";
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, ["-m", "devchat"].concat(args), spawnOptions, undefined, undefined, undefined, undefined);

		logger.channel()?.info(`Finish devchat with arguments: ${args.join(" ")}`);
		if (stderr) {
			logger.channel()?.error(`Error: ${stderr}`);
			logger.channel()?.show();
			return [];
		}

		try {
			const topics = JSON.parse(stdout.trim()).reverse();
			// convert responses to respose, and remove responses field
			// responses is in TopicEntry.root_prompt.responses
			for (const topic of topics) {
				if (topic.root_prompt.responses) {
					topic.root_prompt.response = topic.root_prompt.responses[0];
					delete topic.root_prompt.responses;
				}
			}
			return topics;
		} catch (error) {
			logger.channel()?.error(`Error parsing JSON: ${error}`);
			logger.channel()?.show();
			return [];
		}
	}

	private buildLogArgs(options: LogOptions): string[] {
		let args = ["log"];

		if (options.skip) {
			args.push('--skip', `${options.skip}`);
		}
		if (options.maxCount) {
			args.push('--max-count', `${options.maxCount}`);
		} else {
			const maxLogCount = UiUtilWrapper.getConfiguration('DevChat', 'maxLogCount');
			args.push('--max-count', `${maxLogCount}`);
		}

		if (options.topic) {
			args.push('--topic', `${options.topic}`);
		}

		return args;
	}

	private getDevChatPath(): string {
		let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}
		return devChat;
	}
}

export default DevChat;
