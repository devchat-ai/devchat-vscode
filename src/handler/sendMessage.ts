
import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { stopDevChatBase, sendMessageBase, deleteChatMessageBase } from './sendMessageBase';
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
    _lastMessage = [message];
	_lastMessage[0]['askCode'] = true;

    let pythonVirtualEnv: string|undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
    if (!pythonVirtualEnv) {
		try {
			await vscode.commands.executeCommand('DevChat.AskCodeIndexStart');
		} catch (error) {
			logger.channel()?.error(`Failed to execute command ${message.content[0]}: ${error}`);
			logger.channel()?.show();
			return;
		}

		pythonVirtualEnv = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonVirtualEnv) {
	        MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "Index code fail.", hash: "", user: "", date: 0, isError: true });
    	    return ;
		}
    }

    let envs = {};

    let openaiApiKey = await ApiKeyManager.getApiKey();
    if (!openaiApiKey) {
        logger.channel()?.error('The OpenAI key is invalid!');
        logger.channel()?.show();
        return;
    }
    envs['OPENAI_API_KEY'] = openaiApiKey;

    const openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
    if (openAiApiBase) {
        envs['OPENAI_API_BASE'] = openAiApiBase;
    }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    
    try {
        // create temp directory and file
        const tempDir = await createTempSubdirectory('devchat/context');
        const tempFile = path.join(tempDir, "doc_context.txt");

        // If tempFile already exists, delete it
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        const commandRun = new CommandRun();
        const command = pythonVirtualEnv.trim();
        const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_index_query.py", "query", message.text, tempFile];
        const result = await commandRun.spawnAsync(command, args, { env: envs, cwd: workspaceDir }, (data) => {
            logger.channel()?.info(data);
        }, (data) => {
            logger.channel()?.error(data);
        }, undefined, undefined);

        // Check if tempFile has been written to
        if (!fs.existsSync(tempFile) || fs.readFileSync(tempFile, 'utf8') === '') {
            logger.channel()?.error(`Did not get relevant context from AskCode.`);
            logger.channel()?.show();
			MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: "Did not get relevant context from AskCode.", hash: "", user: "", date: 0, isError: true });
            return;
        }

        // Send message
        await sendMessage({command: "sendMessage", contextInfo: [{file: tempFile, context: ""}], text: message.text, parent_hash: message.hash}, panel);
    } catch (error) {
        if (error instanceof Error) {
            logger.channel()?.error(`error: ${error.message}`);
        } else {
            logger.channel()?.error(`An unknown error occurred: ${error}`);
        }
        logger.channel()?.show();
		MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: "Did not get relevant context from AskCode.", hash: "", user: "", date: 0, isError: true });
    }
}


regInMessage({command: 'askCodeDfs', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
export async function askCodeDfs(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    _lastMessage = [message];
	_lastMessage[0]['askCodeDfs'] = true;

	let pythonVirtualEnv: string|undefined = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
    if (!pythonVirtualEnv) {
		try {
			await vscode.commands.executeCommand('DevChat.AskCodeDfsInstall');
		} catch (error) {
			logger.channel()?.error(`Failed to execute command ${message.content[0]}: ${error}`);
			logger.channel()?.show();
			return;
		}

		pythonVirtualEnv = vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
		if (!pythonVirtualEnv) {
	        MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: "Index code fail.", hash: "", user: "", date: 0, isError: true });
    	    return ;
		}
    }

    let envs = {};

    let openaiApiKey = await ApiKeyManager.getApiKey();
    if (!openaiApiKey) {
        logger.channel()?.error('The OpenAI key is invalid!');
        logger.channel()?.show();
        return;
    }
    envs['OPENAI_API_KEY'] = openaiApiKey;

    const openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
    if (openAiApiBase) {
        envs['OPENAI_API_BASE'] = openAiApiBase;
    }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    
    try {
        // create temp directory and file
        const tempDir = await createTempSubdirectory('devchat/context');
        const tempFile = path.join(tempDir, "doc_context.txt");

        // If tempFile already exists, delete it
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        const commandRun = new CommandRun();
        const command = pythonVirtualEnv.trim();
        const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_search_code_query.py", message.text, tempFile];
        const result = await commandRun.spawnAsync(command, args, { env: envs, cwd: workspaceDir }, (data) => {
            logger.channel()?.info(data);
        }, (data) => {
            logger.channel()?.error(data);
        }, undefined, undefined);

        // Check if tempFile has been written to
        if (!fs.existsSync(tempFile) || fs.readFileSync(tempFile, 'utf8') === '') {
            logger.channel()?.error(`Did not get relevant context from AskCode.`);
            logger.channel()?.show();
			MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: "Did not get relevant context from AskCode.", hash: "", user: "", date: 0, isError: true });
            return;
        }

        // Send message
        await sendMessage({command: "sendMessage", contextInfo: [{file: tempFile, context: ""}], text: message.text, parent_hash: message.hash}, panel);
    } catch (error) {
        if (error instanceof Error) {
            logger.channel()?.error(`error: ${error.message}`);
        } else {
            logger.channel()?.error(`An unknown error occurred: ${error}`);
        }
        logger.channel()?.show();
		MessageHandler.sendMessage(panel,  { command: 'receiveMessage', text: "Did not get relevant context from AskCode.", hash: "", user: "", date: 0, isError: true });
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
		} else if (_lastMessage[0]['askCodeDfs']) {
			await askCodeDfs(_lastMessage[0], panel);
		} else {
			await sendMessage(_lastMessage[0], panel, _lastMessage[1]);
		}
	}
}

regInMessage({command: 'stopDevChat'});
export async function stopDevChat(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	stopDevChatBase(message);
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



