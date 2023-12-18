import * as dotenv from 'dotenv';
import * as path from 'path';

import { logger } from '../util/logger';
import { CommandRun, saveModelSettings } from "../util/commonUtil";
import { UiUtilWrapper } from '../util/uiUtil';
import { ApiKeyManager } from '../util/apiKey';
import { assertValue } from '../util/check';
import { getFileContent } from '../handler/diffHandler';


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

export interface TopicEntry {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	root_prompt: LogEntry;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	latest_time: number;
	hidden: boolean;
	title: string | null;
}

export interface ChatResponse {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"prompt-hash": string;
	user: string;
	date: string;
	response: string;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	finish_reason: string;
	isError: boolean;
}


class DevChat {
	private commandRun: CommandRun;

	constructor() {
		this.commandRun = new CommandRun();
	}

	private async loadContextsFromFiles(contexts: string[] | undefined): Promise<string[]> {
		if (!contexts) {
			return [];
		}

		const loadedContexts: string[] = [];
		for (const context of contexts) {
			const contextContent = await getFileContent(context);
			if (!contextContent) {
				continue;
			}

			loadedContexts.push(contextContent);
		}
		return loadedContexts;
	}

	private async buildArgs(options: ChatOptions): Promise<string[]> {
		let args = ["-m", "devchat", "route"];

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

		const llmModelData = await ApiKeyManager.llmModel();
		assertValue(!llmModelData || !llmModelData.model, 'You must select a LLM model to use for conversations');
		args.push("-m", llmModelData.model);

		const functionCalling = UiUtilWrapper.getConfiguration('DevChat', 'EnableFunctionCalling');
		if (functionCalling) {
			args.push("-a");
		}

		return args;
	}

	private buildLogArgs(options: LogOptions): string[] {
		let args = ["-m", "devchat", "log"];

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

	private parseOutData(stdout: string, isPartial: boolean): ChatResponse {
		const responseLines = stdout.trim().split("\n");

		if (responseLines.length < 2) {
			return this.createChatResponse("", "", "", "", !isPartial);
		}

		const [userLine, remainingLines1] = this.extractLine(responseLines, "User: ");
		const user = this.parseLine(userLine, /User: (.+)/);

		const [dateLine, remainingLines2] = this.extractLine(remainingLines1, "Date: ");
		const date = this.parseLine(dateLine, /Date: (.+)/);

		const [promptHashLine, remainingLines3] = this.extractLine(remainingLines2, "prompt");
		const [finishReasonLine, remainingLines4] = this.extractLine(remainingLines3, "finish_reason:");

		if (!promptHashLine) {
			return this.createChatResponse("", user, date, remainingLines4.join("\n"), !isPartial);
		}

		const finishReason = finishReasonLine.split(" ")[1];
		const promptHash = promptHashLine.split(" ")[1];
		const response = remainingLines4.join("\n");

		return this.createChatResponse(promptHash, user, date, response, false, finishReason);
	}

	private extractLine(lines: string[], startWith: string): [string, string[]] {
		const index = lines.findIndex(line => line.startsWith(startWith));
		const extractedLine = index !== -1 ? lines.splice(index, 1)[0] : "";
		return [extractedLine, lines];
	}

	private parseLine(line: string, regex: RegExp): string {
		return (line.match(regex)?.[1]) ?? "";
	}

	private createChatResponse(promptHash: string, user: string, date: string, response: string, isError: boolean, finishReason = ""): ChatResponse {
		return {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"prompt-hash": promptHash,
			user,
			date,
			response,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			finish_reason: finishReason,
			isError,
		};
	}

	private async runCommand(args: string[]): Promise<{code: number | null, stdout: string, stderr: string}> {
		// build env variables for command
		const envs = {
			...process.env,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"PYTHONUTF8":1,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"PYTHONPATH": UiUtilWrapper.extensionPath() + "/tools/site-packages"
		};

		const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonForChat") || "python3";
		
		// run command
		const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(
			pythonApp,
			args,
			{
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: UiUtilWrapper.workspaceFoldersFirstPath(),
				env: envs
			},
			undefined, undefined, undefined, undefined
		);

		return {code, stdout, stderr};
	}

	public input(data: string) {
		this.commandRun?.write(data + "\n");
	}

	public stop() {
		this.commandRun.stop();
	}

	async chat(content: string, options: ChatOptions = {}, onData: (data: ChatResponse) => void, saveToLog: boolean = true): Promise<ChatResponse> {
		try {
			// build args for devchat prompt command
			const args = await this.buildArgs(options);
			args.push("--");
			args.push(content);

			// build env variables for prompt command
			const llmModelData = await ApiKeyManager.llmModel();
			assertValue(!llmModelData, "No valid llm model selected");
			const envs = {
				...process.env,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"PYTHONUTF8": 1,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"command_python": UiUtilWrapper.getConfiguration('DevChat', 'PythonForCommands') || "python3",
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"PYTHONPATH": UiUtilWrapper.extensionPath() + "/tools/site-packages",
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"OPENAI_API_KEY": llmModelData.api_key,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				...llmModelData.api_base? { "OPENAI_API_BASE": llmModelData.api_base } : {}
			};

			// build process options
			const spawnAsyncOptions = {
				maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
				cwd: UiUtilWrapper.workspaceFoldersFirstPath(),
				env: envs
			};

			// save llm model config
			await saveModelSettings();

			logger.channel()?.info(`api_key: ${llmModelData.api_key.replace(/^(.{4})(.*)(.{4})$/, (_, first, middle, last) => first + middle.replace(/./g, '*') + last)}`);
			logger.channel()?.info(`api_base: ${llmModelData.api_base}`);

			// run command
			//     handle stdout as steam mode
			let receviedStdout = "";
			const onStdoutPartial = (stdout: string) => {
				receviedStdout += stdout;
				const data = this.parseOutData(receviedStdout, true);
				onData(data);
			};
			//     run command
			const pythonApp = UiUtilWrapper.getConfiguration("DevChat", "PythonForChat") || "python3";
			logger.channel()?.info(`Running devchat:${pythonApp} ${args.join(" ")}`);
			const { exitCode: code, stdout, stderr } = await this.commandRun.spawnAsync(pythonApp, args, spawnAsyncOptions, onStdoutPartial, undefined, undefined, undefined);
			//     handle result
			assertValue(code !== 0, stderr || "Command exited with error code");
			const responseData = this.parseOutData(stdout, false);
			let promptHash = "";
			if (saveToLog) {
				await this.logInsert(options.context, content, responseData.response, options.parent);
				const logs = await this.log({"maxCount": 1});
				assertValue(!logs || !logs.length, "Failed to insert devchat log");
				promptHash = logs[0]["hash"];
			}
			//     return result
			return {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"prompt-hash": promptHash,
				user: "",
				date: "",
				response: responseData.response,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				finish_reason: "",
				isError: false,
			};
		} catch (error: any) {
			return {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"prompt-hash": "",
				user: "",
				date: "",
				response: `Error: ${error.message}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				finish_reason: "error",
				isError: true,
			};
		}
	}

	async logInsert(contexts: string[] | undefined, request: string, response: string, parent: string | undefined): Promise<boolean> {
		try {
			// build log data
			const llmModelData = await ApiKeyManager.llmModel();
			const contextContentList = await this.loadContextsFromFiles(contexts);
			const contextWithRoleList = contextContentList.map(content => {
				return {
					"role": "system",
					"content": `<context>${content}</context>`
				};
			});

			let logData = {
				"model": llmModelData?.model || "gpt-3.5-turbo",
				"messages": [
					{
						"role": "user",
						"content": request
					},
					{
						"role": "assistant",
						"content": response
					},
					...contextWithRoleList
				],
				"timestamp": Math.floor(Date.now()/1000),
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"request_tokens": 1,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"response_tokens": 1,
				...parent? {"parent": parent} : {}
			};

			// build args for log insert
			const args = ["-m", "devchat", "log", "--insert", JSON.stringify(logData)];
			
			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stdout.indexOf('Failed to insert log') >= 0, stdout);
			assertValue(stderr, stderr);

			return true;
		} catch (error: any) {
			logger.channel()?.error(`Failed to insert log: ${error.message}`);
			logger.channel()?.show();
			return false;
		}
	}

	async delete(hash: string): Promise<boolean> {
		try {
			// build args for log delete
			const args = ["-m", "devchat", "log", "--delete", hash];

			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stdout.indexOf('Failed to delete prompt') >= 0, stdout);
			assertValue(stderr, stderr);

			return true;
		} catch (error: any) {
			logger.channel()?.error(`Failed to delete log: ${error.message}`);
			logger.channel()?.show();
			return false;
		}
	}

	async log(options: LogOptions = {}): Promise<LogEntry[]> {
		try {
			const args = this.buildLogArgs(options);

			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stderr, stderr);

			const logs = JSON.parse(stdout.trim()).reverse();
			for (const log of logs) {
				log.response = log.responses[0];
				delete log.responses;
			}
			return logs;
		} catch (error: any) {
			logger.channel()?.error(`Failed to get logs: ${error.message}`);
			logger.channel()?.show();
			return [];
		}
	}

	async commands(): Promise<CommandEntry[]> {
		try {
			const args = ["-m", "devchat", "run", "--list"];

			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stderr, stderr);

			const commands = JSON.parse(stdout.trim());

			return commands;
		} catch (error: any) {
			logger.channel()?.error(`Error: ${error.message}`);
			logger.channel()?.show();
			return [];
		}
	}

	async updateSysCommand(): Promise<string> {
		try {
			const args = ["-m", "devchat", "run", "--update-sys"];

			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stderr, stderr);

			logger.channel()?.info(`${stdout}`);
			return stdout;
		} catch (error: any) {
			logger.channel()?.error(`Error: ${error.message}`);
			logger.channel()?.show();
			return "";
		}
	}

	async topics(): Promise<TopicEntry[]> {
		try {
			const args = ["-m", "devchat", "topic", "-l"];

			const {code, stdout, stderr} = await this.runCommand(args);

			assertValue(code !== 0, stderr || `Command exited with ${code}`);
			assertValue(stderr, stderr);

			const topics = JSON.parse(stdout.trim()).reverse();
			for (const topic of topics) {
				if (topic.root_prompt.responses) {
					topic.root_prompt.response = topic.root_prompt.responses[0];
					delete topic.root_prompt.responses;
				}
			}
			return topics;
		} catch (error: any) {
			logger.channel()?.error(`Error: ${error.message}`);
			logger.channel()?.show();
			return [];
		}
	}
}

export default DevChat;
