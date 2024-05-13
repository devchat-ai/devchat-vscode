import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';
import DevChat from '../toolwrapper/devchat';


let existPannel: vscode.WebviewPanel|vscode.WebviewView|undefined = undefined;

regInMessage({command: 'regCommandList'});
regOutMessage({command: 'regCommandList', result: [{name: '', pattern: '', description: ''}]});
export async function getWorkflowCommandList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	existPannel = panel;

	const commandList = await new DevChat().commands();
	MessageHandler.sendMessage(panel, { command: 'regCommandList', result: commandList });
	return;
}

export async function sendCommandListByDevChatRun() {
	if (existPannel) {
		await getWorkflowCommandList({}, existPannel!);
	}
}
