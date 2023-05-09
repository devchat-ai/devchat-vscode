// devchat.ts

import { spawn } from "child_process";
import { promisify } from "util";
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { logger } from '../util/logger';

const spawnAsync = async (command: string, args: string[], options: any, onData: (data: string) => void): Promise<{ code: number, stdout: string; stderr: string }> => {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, options);
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			const dataStr = data.toString();
			onData(dataStr);
			stdout += dataStr;
		});

		child.stderr.on('data', (data) => {
			stderr += data;
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve({ code, stdout, stderr });
			} else {
				reject({ code, stdout, stderr });
			}
		});
	});
};

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
	async chat(content: string, options: ChatOptions = {}, onData: (data: string) => void): Promise<ChatResponse> {
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
			args.push("-c", options.context.join(","));
		}
		args.push(content)

		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		// const openaiApiKey = process.env.OPENAI_API_KEY;

		let openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('OpenAI.apiKey');
		if (!openaiApiKey) {
			openaiApiKey = process.env.OPENAI_API_KEY;
		}

		const openaiModel = vscode.workspace.getConfiguration('DevChat').get('OpenAI.model');
		const openaiTemperature = vscode.workspace.getConfiguration('DevChat').get('OpenAI.temperature');
		const openaiStream = vscode.workspace.getConfiguration('DevChat').get('OpenAI.stream');
		const llmModel = vscode.workspace.getConfiguration('DevChat').get('llmModel');
		const tokensPerPrompt = vscode.workspace.getConfiguration('DevChat').get('OpenAI.tokensPerPrompt');
		const userHistoryPrompts = vscode.workspace.getConfiguration('DevChat').get('OpenAI.useHistoryPrompt');
		
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
			logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
			const { code, stdout, stderr } = await spawnAsync('devchat', args, {
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: workspaceDir,
				env: {
					...process.env,
					OPENAI_API_KEY: openaiApiKey,
				},
			}, onData);

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

			const responseLines = stdout.trim().split("\n");
			
			if (responseLines.length === 0) {
				return {
					"prompt-hash": "",
					user: "",
					date: "",
					response: "",
					isError: true,
				};
			}

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
					user: "",
					date: "",
					response: responseLines.join("\n"),
					isError: true,
				};
			}

			const promptHash = promptHashLine.split(" ")[1];

			const userLine = responseLines.shift()!;
			const user = (userLine.match(/User: (.+)/)?.[1]) ?? "";

			const dateLine = responseLines.shift()!;
			const date = (dateLine.match(/Date: (.+)/)?.[1]) ?? "";

			const response = responseLines.join("\n");

			return {
				"prompt-hash": promptHash,
				user,
				date,
				response,
				isError: false,
			};
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
		}
		if (options.maxCount) {
			args.push('--max-count', `${options.maxCount}`);
		}

		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		const openaiApiKey = process.env.OPENAI_API_KEY;

		try {
			logger.channel()?.info(`Running devchat with args: ${args.join(" ")}`);
			const { code, stdout, stderr } = await spawnAsync('devchat', args, {
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

			const stdoutNew = "[" + stdout.replace(/\}\n\]\n\[\n  \{\n/g, "}\n],\n[\n  {\n") + "]";
            return JSON.parse(stdoutNew.trim());
		} catch (error) {
			logger.channel()?.error(`Error getting log: ${error}`);
			logger.channel()?.show();
			return [];
		}
	}
}

export default DevChat;
