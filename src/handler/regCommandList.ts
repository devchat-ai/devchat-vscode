import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import { MessageHandler } from './messageHandler';

export async function regCommandList(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const commandList = CommandManager.getInstance().getCommandList();
	MessageHandler.sendMessage(panel, { command: 'regCommandList', result: commandList });
	return;
}



