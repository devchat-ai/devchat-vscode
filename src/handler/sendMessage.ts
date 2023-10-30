
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
import { CommandRun, createTempSubdirectory } from '../util/commonUtil';

const exec = promisify(execCb);

let askcode_stop = true;
let askcode_runner : CommandRun | null = null;

let _lastMessage: any = undefined;

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

regInMessage({command: 'askCode', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
export async function askCode(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    try {
		askcode_stop = false;
		askcode_runner = null;

		_lastMessage = [message];
		_lastMessage[0]['askCode'] = true;

		const port = await UiUtilWrapper.getLSPBrigePort();

		const pythonVirtualEnv: string  | undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonVirtualEnv) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "Index code fail.", hash: "", user: "", date: 0, isError: true });
			return ;
		}

		let envs = {
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
		if (askcode_stop) {
			return;
		}
		
		try {
			let outputResult = "";
			askcode_runner = new CommandRun();
			const command = pythonVirtualEnv.trim();
			const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_index_query.py", "query", message.text, `${port}`];
			const result = await askcode_runner.spawnAsync(command, args, { env: envs, cwd: workspaceDir }, (data) => {
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
					{ response: result.stdout, "prompt-hash": logHash, user: "", "date": dateStr, finish_reason: "", isError: false });
			} else {
				logger.channel()?.info(`${result.stdout}`);
				if (askcode_stop == false) {
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
		askcode_stop = true;
		askcode_runner = null;
	}
}


regInMessage({command: 'sendMessage', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
regOutMessage({ command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'});
// message: { command: 'sendMessage', text: 'xxx', hash: 'xxx'}
// return message: 
//     { command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'}
//     { command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'}
export async function sendMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView, function_name: string|undefined = undefined): Promise<void> {
    if (function_name !== undefined && function_name !== "") {
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
	_lastMessage = [message, function_name];

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
    }, function_name);
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

	if (askcode_stop === false) {
		askcode_stop = true;
		if (askcode_runner) {
			askcode_runner.stop();
			askcode_runner = null;
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



