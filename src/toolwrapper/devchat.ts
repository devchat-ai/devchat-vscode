// devchat.ts

import { spawn } from "child_process";
import { promisify } from "util";
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { logger } from '../util/logger';
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
	private childProcess: any;

	async spawnAsync(command: string, args: string[], options: any, onData: (data: string) => void): Promise<{ code: number, stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			this.childProcess = spawn(command, args, options);
			
			let stdout = '';
			let stderr = '';
	
			this.childProcess.stdout.on('data', (data: { toString: () => any; }) => {
				const dataStr = data.toString();
				onData(dataStr);
				stdout += dataStr;
			});
	
			this.childProcess.stderr.on('data', (data: string) => {
				stderr += data;
			});
	
			this.childProcess.on('close', (code: number) => {
				if (stderr) {
					logger.channel()?.error(stderr);
					logger.channel()?.show();
				}

				if (code === 0) {
					resolve({ code, stdout, stderr });
				} else {
					reject({ code, stdout, stderr });
				}
			});
		});
	};

	public stop() {
		if (this.childProcess) {
		  	this.childProcess.kill();
		  	this.childProcess = null;
		}
	}

	async chat(content: string, options: ChatOptions = {}, onData: (data: ChatResponse) => void): Promise<ChatResponse> {
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

		args.push(content)

		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		// const openaiApiKey = process.env.OPENAI_API_KEY;

		const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
		let openaiApiKey = await secretStorage.get("devchat_OPENAI_API_KEY");
		if (!openaiApiKey) {
			openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('OpenAI.apiKey');
		}
		if (!openaiApiKey) {
			openaiApiKey = process.env.OPENAI_API_KEY;
		}
		if (!openaiApiKey) {
			logger.channel()?.error('openAI key is invalid!');
			logger.channel()?.show();
		}

		const openAiApiBase = vscode.workspace.getConfiguration('DevChat').get('OpenAI.EndPoint');
		const openAiApiBaseObject = openAiApiBase ? { OPENAI_API_BASE: openAiApiBase } : {};

		const openaiModel = vscode.workspace.getConfiguration('DevChat').get('OpenAI.model');
		const openaiTemperature = vscode.workspace.getConfiguration('DevChat').get('OpenAI.temperature');
		const openaiStream = vscode.workspace.getConfiguration('DevChat').get('OpenAI.stream');
		const llmModel = vscode.workspace.getConfiguration('DevChat').get('llmModel');
		const tokensPerPrompt = vscode.workspace.getConfiguration('DevChat').get('OpenAI.tokensPerPrompt');
		const userHistoryPrompts = vscode.workspace.getConfiguration('DevChat').get('OpenAI.useHistoryPrompt');

		let devChat : string|undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}

		if (userHistoryPrompts && options.parent) {
			args.push("-p", options.parent);
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
			const parseOutData = (stdout: string, isPartial: boolean) => {
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
			};

			let receviedStdout = "";
			const onStdoutPartial = (stdout: string) => {
				receviedStdout += stdout;
				const data = parseOutData(receviedStdout, true);
				onData(data);
			};

			logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
			const { code, stdout, stderr } = await this.spawnAsync(devChat, args, {
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: workspaceDir,
				env: {
					...process.env,
					OPENAI_API_KEY: openaiApiKey,
					...openAiApiBaseObject
				},
			}, onStdoutPartial);

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

			const response = parseOutData(stdout, false);
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
		let args = ["log"];

		if (options.skip) {
			args.push('--skip', `${options.skip}`);
		} else {
			const skipLogCount = vscode.workspace.getConfiguration('DevChat').get('logSkip');
			args.push('--skip', `${skipLogCount}`);
		}
		if (options.maxCount) {
			args.push('--max-count', `${options.maxCount}`);
		} else {
			const maxLogCount = vscode.workspace.getConfiguration('DevChat').get('maxLogCount');
			args.push('--max-count', `${maxLogCount}`);
		}

		let devChat : string|undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
		if (!devChat) {
			devChat = 'devchat';
		}

		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		const openaiApiKey = process.env.OPENAI_API_KEY;

		try {
			logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
			const { code, stdout, stderr } = await this.spawnAsync(devChat, args, {
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: workspaceDir,
				env: {
					...process.env,
					OPENAI_API_KEY: openaiApiKey,
				},
			}, (partialResponse: string) => { });

			if (stderr) {
				logger.channel()?.error(`Error getting log: ${stderr}`);
				logger.channel()?.show();
				return [];
			}

            return JSON.parse(stdout.trim()).reverse();
		} catch (error) {
			logger.channel()?.error(`Error getting log: ${error}`);
			logger.channel()?.show();
			return [];
		}
	}
}

export default DevChat;
