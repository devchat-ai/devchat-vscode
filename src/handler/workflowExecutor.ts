


// TODO
// 临时解决方案，后续需要修改

import * as vscode from 'vscode';
import { UiUtilWrapper } from "../util/uiUtil";
import { MessageHandler } from "../handler/messageHandler";
import { ApiKeyManager } from "../util/apiKey";
import { logger } from "../util/logger";
import { CommandResult, CommandRun, saveModelSettings } from "../util/commonUtil";
import { handleTopic, insertDevChatLog } from "./sendMessageBase";
import { regInMessage } from "@/util/reg_messages";
import parseArgsStringToArgv from 'string-argv';


async function handleWorkflowRequest(request): Promise<string | undefined> {
	/*
	request: {
		"command": "some command",
		"args": {
			"arg1": "value1",
			"arg2": "value2"
		}
	}
	response: {
		"status": "success",
		"result": "success",
		"detail": "some detail"
	}
	*/
	if (!request || !request.command) {
		return undefined;
	}

	if (request.command === "get_lsp_brige_port") {
		return JSON.stringify({
			"status": "success",
			"result": await UiUtilWrapper.getLSPBrigePort()
		});
	} else {
		return JSON.stringify({
			"status": "fail",
			"result": "fail",
			"detail": "command is not supported"
		});
	}
}


// TODO
// 临时解决方案，后续需要修改
// 执行workflow

// workflow执行时，都是通过启动一个进程的方式来执行。
// 与一般进程不同的是：
// 1. 通过UI交互可以停止该进程；
// 2. 需要在进程启动前初始化相关的环境变量
// 3. 需要处理进程的通信


export class WorkflowRunner {
	private _commandRunner: CommandRun | null = null;
	private _stop: boolean = false;
	private _cacheOut: string = "";
	private _panel: vscode.WebviewPanel|vscode.WebviewView | null = null;

	constructor() {}

	private async _getApiKeyAndApiBase(): Promise<[string | undefined, string | undefined]> {
		const llmModelData = await ApiKeyManager.llmModel();
		if (!llmModelData) {
			logger.channel()?.error('No valid llm model is selected!');
			logger.channel()?.show();
			return [undefined, undefined];
		}

		let openaiApiKey = llmModelData.api_key;
		if (!openaiApiKey) {
			logger.channel()?.error('The OpenAI key is invalid!');
			logger.channel()?.show();
			return [undefined, undefined];
		}

		const openAiApiBase = llmModelData.api_base;
		return [openaiApiKey, openAiApiBase];
	}

	private _parseCommandOutput(outputStr: string): string {
		/*
		output is format as:
	<<Start>>
	{"content": "data"}
	<<End>>
		*/
		const outputWitchCache = this._cacheOut + outputStr;
		this._cacheOut = "";

		let outputResult = "";
		let curPos = 0;
		while (true) {
			const startPos = outputWitchCache.indexOf('<<Start>>', curPos);
			const startPos2 = outputWitchCache.indexOf('```', curPos);
			if (startPos === -1 && startPos2 === -1) {
				break;
			}

			const isStart = (startPos2 === -1) || (startPos > -1 && startPos < startPos2);

			let endPos = -1;
			if (isStart) {
				endPos = outputWitchCache.indexOf('<<End>>', startPos+9);
			} else {
				endPos = outputWitchCache.indexOf('```', startPos2+3);
			}

			if (endPos === -1) {
				this._cacheOut = outputWitchCache.substring(startPos, outputWitchCache.length);
				break;
			}

			let contentStr = "";
			if (isStart) {
				contentStr = outputWitchCache.substring(startPos+9, endPos);
				curPos = endPos+7;
			} else {
				contentStr = outputWitchCache.substring(startPos2, endPos+3);
				curPos = endPos+3;
			}
			
			outputResult += contentStr.trim() + "\n\n";
		}

		return outputResult;
	}

	private async _runCommand(commandWithArgs: string, commandEnvs: any): Promise<[CommandResult | undefined, string]> {
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath() || "";
		let commandOutput = "";
		let commandAnswer = "";

		try {
			const commandAndArgsList = parseArgsStringToArgv(commandWithArgs);
			this._commandRunner = new CommandRun();
			await saveModelSettings();
			const result = await this._commandRunner.spawnAsync(commandAndArgsList[0], commandAndArgsList.slice(1), { env: commandEnvs, cwd: workspaceDir }, async (data) => {
				// handle command stdout
				const newData = this._parseCommandOutput(data);
				// if newData is json string, then process it by handleWorkflowRequest
				let newDataObj: any = undefined;
				try {
					newDataObj = JSON.parse(newData);
					const result = await handleWorkflowRequest(newDataObj);
					if (result) {
						
						this.input(result);
					} else if (newDataObj!.result) {
						commandAnswer = newDataObj!.result;
						commandOutput += newDataObj!.result;
						logger.channel()?.info(newDataObj!.result);
						MessageHandler.sendMessage(this._panel!,  { command: 'receiveMessagePartial', text: commandOutput, hash:"", user:"", isError: false });
					}
				} catch (e) {
					if (newData.length > 0){
						commandOutput += newData;
						logger.channel()?.info(newData);
						MessageHandler.sendMessage(this._panel!,  { command: 'receiveMessagePartial', text: commandOutput, hash:"", user:"", isError: false });
					}
				}
			}, (data) => {
				// handle command stderr
				logger.channel()?.error(data);
				logger.channel()?.show();
			}, undefined, undefined);


			return [result, commandAnswer];
		} catch (error) {
			if (error instanceof Error) {
				logger.channel()?.error(`error: ${error.message}`);
			} else {
				logger.channel()?.error(`An unknown error occurred: ${error}`);
			}
			logger.channel()?.show();
		}
		return [undefined, ""];
	}

	public stop(): void {
		this._stop = true;
		if (this._commandRunner) {
			this._commandRunner.stop();
			this._commandRunner = null;
		}
	}

	public input(data): void {
		const userInputWithFlag = `\n<<Start>>\n${data}\n<<End>>\n`;
		this._commandRunner?.write(userInputWithFlag);
	}

	public async run(workflow: string, commandDefines: any, message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
		/*
		1. 判断workflow是否有输入存在
		2. 获取workflow的环境变量信息
		3. 执行workflow command
		4. 处理workflow command输出
		*/

		this._panel = panel;
		
		// 获取workflow的python命令
		const pythonVirtualEnv: string  | undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonVirtualEnv) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "Index code fail.", hash: "", user: "", date: 0, isError: true });
			return ;
		}

		// 获取扩展路径
		const extensionPath = UiUtilWrapper.extensionPath();

		// 获取api_key 和 api_base
		const [apiKey, aipBase] = await this._getApiKeyAndApiBase();
		if (!apiKey) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "The OpenAI key is invalid!", hash: "", user: "", date: 0, isError: true });
			return ;
		}

		// 构建子进程环境变量
		const workflowEnvs = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"PYTHONUTF8":1,
			"DEVCHATPYTHON": UiUtilWrapper.getConfiguration("DevChat", "PythonPath") || "python3",
			"PYTHONLIBPATH": `${extensionPath}/tools/site-packages`,
			"PARENT_HASH": message.parent_hash,
			...process.env,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			OPENAI_API_KEY: apiKey,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			...(aipBase ? { 'OPENAI_API_BASE': aipBase } : {})
		};

		const requireInput = commandDefines.input === "required";
		if (requireInput && message.text.replace("/" + workflow, "").trim() === "") {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: `The workflow ${workflow} need input!`, hash: "", user: "", date: 0, isError: true });
			return ;
		}

		const workflowCommand = commandDefines.steps[0].run.replace(
			'$command_python', `${pythonVirtualEnv}`).replace(
			'$input', `${message.text.replace("/" + workflow, "").trim()}`);
		
		const [commandResult, commandAnswer] = await this._runCommand(workflowCommand, workflowEnvs);

		if (commandResult && commandResult.exitCode === 0) {
			const resultOut = commandAnswer === "" ? "success" : commandAnswer;
			let logHash = await insertDevChatLog(message, message.text, resultOut);
			if (!logHash) {
				logHash = "";
				logger.channel()?.error(`Failed to insert devchat log.`);
				logger.channel()?.show();
			}

			//MessageHandler.sendMessage(panel,  { command: 'receiveMessagePartial', text: resultOut, hash:logHash, user:"", isError: false });
			MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: resultOut, hash:logHash, user:"", date:0, isError: false });

			const dateStr = Math.floor(Date.now()/1000).toString();
			await handleTopic(
				message.parent_hash,
				{"text": message.text}, 
				// eslint-disable-next-line @typescript-eslint/naming-convention
				{ response: resultOut, "prompt-hash": logHash, user: "", "date": dateStr, finish_reason: "", isError: false });
		} else if (commandResult) {
			logger.channel()?.info(`${commandResult.stdout}`);
			if (this._stop === false) {
				MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: commandResult.stderr, hash: "", user: "", date: 0, isError: true });
			}
		}
	}
}
