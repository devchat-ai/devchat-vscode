import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import {messageHandler} from './messageHandler';


async function regCommandList(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const commandList = CommandManager.getInstance().getCommandList();
	panel.webview.postMessage({ command: 'regCommandList', result: commandList });
	return;
}

messageHandler.registerHandler('regCommandList', regCommandList);

