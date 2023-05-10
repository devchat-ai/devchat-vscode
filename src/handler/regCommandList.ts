import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';


regInMessage({command: 'regCommandList'});
regOutMessage({command: 'regCommandList', result: [{name: '', pattern: '', description: ''}]});
export async function regCommandList(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const commandList = CommandManager.getInstance().getCommandList();
	MessageHandler.sendMessage(panel, { command: 'regCommandList', result: commandList });
	return;
}



