
import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { stopDevChatBase, sendMessageBase, deleteChatMessageBase, insertDevChatLog, handleTopic } from './sendMessageBase';
import { UiUtilWrapper } from '../util/uiUtil';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ApiKeyManager } from '../util/apiKey';
import { logger } from '../util/logger';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { CommandResult, CommandRun, createTempSubdirectory } from '../util/commonUtil';

const exec = promisify(execCb);

let askcodeStop = true;
let askcodeRunner : CommandRun | null = null;
let commandRunner : CommandRun | null = null;

let _lastMessage: any = undefined;


async function runCommand(command: string,
		args: string[],
		needProject: boolean,
		panel: vscode.WebviewPanel|vscode.WebviewView,
		onData: ((data: string) => void) | undefined,
		onError: ((data: string) => void) | undefined): Promise<CommandResult | undefined>  {
	let workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
	if (needProject && !workspaceDir) {
		logger.channel()?.error('No workspace exists!');
		logger.channel()?.show();
		return undefined;
	}
	if (!workspaceDir) {
		workspaceDir = ".";
	}


	const llmModelData = await ApiKeyManager.llmModel();
	if (!llmModelData) {
		logger.channel()?.error('No valid llm model is selected!');
		logger.channel()?.show();
		return undefined;
	}

	let openaiApiKey = llmModelData.api_key;
	if (!openaiApiKey) {
		logger.channel()?.error('The OpenAI key is invalid!');
		logger.channel()?.show();
		return undefined;
	}

	const openAiApiBase = llmModelData.api_base;
	
	let envs = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"PYTHONUTF8":1,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		PYTHONPATH: UiUtilWrapper.extensionPath() + "/tools/site-packages",
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		OPENAI_API_KEY: openaiApiKey
	};
	if (openAiApiBase) {
		envs['OPENAI_API_BASE'] = openAiApiBase;
	}

	try {
		commandRunner = new CommandRun();
		const result = await commandRunner.spawnAsync(command, args, { env: envs, cwd: workspaceDir }, (data) => {
			if (onData) {
				onData(data);
			}
		}, (data) => {
			if (onError) {
				onError(data);
			}
		}, undefined, undefined);

		return result;
	} catch (error) {
		if (error instanceof Error) {
			logger.channel()?.error(`error: ${error.message}`);
		} else {
			logger.channel()?.error(`An unknown error occurred: ${error}`);
		}
		logger.channel()?.show();
	}
	return undefined;
}


export function createTempFile(content: string): string {
    // Generate a unique file name
    const fileName = path.join(os.tmpdir(), `temp_${Date.now()}.txt`);

    // Write the content to the file
    fs.writeFileSync(fileName, content);

    return fileName;
}

export function deleteTempFiles(fileName: string): void {
    // Delete the file
    fs.unlinkSync(fileName);
}

function parseCommandOutput(outputStr: string): string {
	/*
	output is format as:
<<Start>>
{"content": "data"}
<<End>>
	*/
	let outputResult = "";
	let curPos = 0;
	while (true) {
		const startPos = outputStr.indexOf('<<Start>>', curPos);
		if (startPos === -1) {
			break;
		}
		const endPos = outputStr.indexOf('<<End>>', startPos+9);
		if (endPos === -1) {
			break;
		}
		const jsonStr = outputStr.substring(startPos+9, endPos);
		try {
			const dataObject = JSON.parse(jsonStr);
			if (dataObject && dataObject.content) {
				outputResult += dataObject.content;
			}
		} catch (e) {
			logger.channel()?.error(`parse ${jsonStr} error: ${e}`);
			logger.channel()?.show();
		}

		curPos = endPos+7;
	}
	return outputResult;
}

regInMessage({command: 'userInput', text: '{"field": "value", "field2": "value2"}'});;
export async function userInput(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const userInputWithFlag = `
<<Start>>
${message.text}
<<End>>
	`;
	commandRunner?.write(userInputWithFlag);
	return undefined;
}


// eslint-disable-next-line @typescript-eslint/naming-convention
regInMessage({command: 'askCode', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
export async function askCode(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    try {
		askcodeStop = false;
		askcodeRunner = null;

		_lastMessage = [message];
		_lastMessage[0]['askCode'] = true;

		const port = await UiUtilWrapper.getLSPBrigePort();

		const pythonVirtualEnv: string  | undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonVirtualEnv) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "Index code fail.", hash: "", user: "", date: 0, isError: true });
			return ;
		}

		let envs = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			PYTHONUTF8:1,
			...process.env,
		};

		const llmModelData = await ApiKeyManager.llmModel();
		if (!llmModelData) {
			logger.channel()?.error('No valid llm model is selected!');
			logger.channel()?.show();
			return;
		}

		let openaiApiKey = llmModelData.api_key;
		if (!openaiApiKey) {
			logger.channel()?.error('The OpenAI key is invalid!');
			logger.channel()?.show();
			return;
		}
		envs['OPENAI_API_KEY'] = openaiApiKey;

		const openAiApiBase = llmModelData.api_base;
		if (openAiApiBase) {
			envs['OPENAI_API_BASE'] = openAiApiBase;
		}

		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		if (askcodeStop) {
			return;
		}
		
		try {
			let outputResult = "";
			askcodeRunner = new CommandRun();
			const command = pythonVirtualEnv.trim();
			const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_index_query.py", "query", message.text, `${port}`];
			const result = await askcodeRunner.spawnAsync(command, args, { env: envs, cwd: workspaceDir }, (data) => {
				outputResult += data;
				MessageHandler.sendMessage(panel,  { command: 'receiveMessagePartial', text: outputResult, hash:"", user:"", isError: false });
				logger.channel()?.info(data);
			}, (data) => {
				logger.channel()?.error(data);
			}, undefined, undefined);

			if (result.exitCode === 0) {
				// save askcode result to devchat
				const stepIndex = result.stdout.lastIndexOf("```Step");
				const stepEndIndex = result.stdout.lastIndexOf("```");
				let resultOut = result.stdout;
				if (stepIndex > 0 && stepEndIndex > 0) {
					resultOut = result.stdout.substring(stepEndIndex+3, result.stdout.length);
				}
				let logHash = await insertDevChatLog(message, "/ask-code " + message.text, resultOut);
				if (!logHash) {
					logHash = "";
					logger.channel()?.error(`Failed to insert devchat log.`);
					logger.channel()?.show();
				}

				MessageHandler.sendMessage(panel,  { command: 'receiveMessagePartial', text: result.stdout, hash:logHash, user:"", isError: false });
				MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: result.stdout, hash:logHash, user:"", date:0, isError: false });

				const dateStr = Math.floor(Date.now()/1000).toString();
				await handleTopic(
					message.parent_hash,
					{"text": "/ask-code " + message.text}, 
					// eslint-disable-next-line @typescript-eslint/naming-convention
					{ response: result.stdout, "prompt-hash": logHash, user: "", "date": dateStr, finish_reason: "", isError: false });
			} else {
				logger.channel()?.info(`${result.stdout}`);
				if (askcodeStop === false) {
					MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: result.stderr, hash: "", user: "", date: 0, isError: true });
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				logger.channel()?.error(`error: ${error.message}`);
			} else {
				logger.channel()?.error(`An unknown error occurred: ${error}`);
			}
			logger.channel()?.show();
			MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: "Did not get relevant context from AskCode.", hash: "", user: "", date: 0, isError: true });
		}
	} finally {
		askcodeStop = true;
		askcodeRunner = null;
	}
}


// eslint-disable-next-line @typescript-eslint/naming-convention
regInMessage({command: 'commit', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
export async function commit(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    try {
		askcodeStop = false;
		askcodeRunner = null;

		_lastMessage = [message];
		_lastMessage[0]['commit'] = true;

		const pythonCommand: string  | undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonCommand) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "No valid python.", hash: "", user: "", date: 0, isError: true });
			return ;
		}

		const args = [UiUtilWrapper.extensionPath() + "/tools/commit.py", pythonCommand, message.text];
		
		let outputResult = "";
		const commandResult = await runCommand(pythonCommand, args, true, panel, 
			(data) => {
				const newData = parseCommandOutput(data);
				if (newData.length > 0){
					outputResult += newData;
					MessageHandler.sendMessage(panel,  { command: 'receiveMessagePartial', text: outputResult, hash:"", user:"", isError: false });
					// MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: outputResult, hash:"", user:"", date:0, isError: false });
					logger.channel()?.info(data);
				}
			}, (error) => {
				logger.channel()?.error(error);
				logger.channel()?.show();
			});

		if (commandResult && commandResult.exitCode === 0) {
			const resultOut = parseCommandOutput(commandResult.stdout);
			let logHash = await insertDevChatLog(message, message.text, resultOut);
			if (!logHash) {
				logHash = "";
				logger.channel()?.error(`Failed to insert devchat log.`);
				logger.channel()?.show();
			}

			MessageHandler.sendMessage(panel,  { command: 'receiveMessagePartial', text: resultOut, hash:logHash, user:"", isError: false });
			MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: resultOut, hash:logHash, user:"", date:0, isError: false });

			const dateStr = Math.floor(Date.now()/1000).toString();
			await handleTopic(
				message.parent_hash,
				{"text": "/ask-code " + message.text}, 
				// eslint-disable-next-line @typescript-eslint/naming-convention
				{ response: resultOut, "prompt-hash": logHash, user: "", "date": dateStr, finish_reason: "", isError: false });
		} else if (commandResult) {
			logger.channel()?.info(`${commandResult.stdout}`);
			if (askcodeStop === false) {
				MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: commandResult.stderr, hash: "", user: "", date: 0, isError: true });
			}
		}
	} finally {
		askcodeStop = true;
		askcodeRunner = null;
	}
}


// eslint-disable-next-line @typescript-eslint/naming-convention
regInMessage({command: 'sendMessage', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
regOutMessage({ command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'});
// message: { command: 'sendMessage', text: 'xxx', hash: 'xxx'}
// return message: 
//     { command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'}
//     { command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'}
export async function sendMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView, functionName: string|undefined = undefined): Promise<void> {
    if (functionName !== undefined && functionName !== "") {
		const messageText = _lastMessage[0].text.trim();
		if (messageText[0] === '/' && message.text[0] !== '/') {
			const indexS = messageText.indexOf(' ');
			let preCommand = messageText;
			if (indexS !== -1) {
				preCommand = messageText.substring(0, indexS);
			}

			message.text = preCommand + ' ' + message.text;
		}
	}
	_lastMessage = [message, functionName];

    // Add a new field to store the names of temporary files
    let tempFiles: string[] = [];

    // Handle the contextInfo field in the message
    if (Array.isArray(message.contextInfo)) {
        for (let context of message.contextInfo) {
            if (typeof context === 'object' && context !== null && 'context' in context) {
                // If the file name is not present, create a temporary file
                if (!context.file) {
                    try {
                        const contextStr = JSON.stringify(context.context);
                        context.file = createTempFile(contextStr);
                        // Add the file name to the tempFiles array
                        tempFiles.push(context.file);
                    } catch (err) {
                        console.error('Failed to create temporary file:', err);
                        throw err;
                    }
                }
                // Insert the file name into the text field
                message.text += ` [context|${context.file}]`;
            }
        }
    }
	// clear message.contextInfo
	message.contextInfo = undefined;

    const responseMessage = await sendMessageBase(message, (data: { command: string, text: string, user: string, date: string}) => {
        MessageHandler.sendMessage(panel, data, false);
    }, functionName);
    if (responseMessage) {
        MessageHandler.sendMessage(panel, responseMessage);
    }

    // Delete all temporary files created
    for (let file of tempFiles) {
        deleteTempFiles(file);
    }
}


// regeneration last message again
regInMessage({command: 'regeneration'});
export async function regeneration(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// call sendMessage to send last message again
	if (_lastMessage) {
		if (_lastMessage[0]['askCode']) {
			await askCode(_lastMessage[0], panel);
		} else {
			await sendMessage(_lastMessage[0], panel, _lastMessage[1]);
		}
	}
}

regInMessage({command: 'stopDevChat'});
export async function stopDevChat(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	stopDevChatBase(message);

	if (askcodeStop === false) {
		askcodeStop = true;
		if (askcodeRunner) {
			askcodeRunner.stop();
			askcodeRunner = null;
		}
		if (commandRunner) {
			commandRunner.stop();
			commandRunner = null;
		}
		await vscode.commands.executeCommand('DevChat.AskCodeIndexStop');
	}
}

regInMessage({command: 'deleteChatMessage', hash: 'xxx'});
regOutMessage({ command: 'deletedChatMessage', hash: 'xxxx'});
export async function deleteChatMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// prompt user to confirm
	const confirm = await vscode.window.showWarningMessage(
		`Are you sure to delete this message?`,
		{ modal: true },
		'Delete'
	);
	if (confirm !== 'Delete') {
		return;
	}
	
	const deleted = await deleteChatMessageBase(message);
	if (deleted) {
		MessageHandler.sendMessage(panel, { command: 'deletedChatMessage', hash: message.hash });
	} else {
		UiUtilWrapper.showErrorMessage('Delete message failed!');
	}
}



