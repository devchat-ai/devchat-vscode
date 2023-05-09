import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import { MessageHandler } from './messageHandler';

export async function convertCommand(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const newText = await CommandManager.getInstance().processText(message.text);
	MessageHandler.sendMessage(panel, { command: 'convertCommand', result: newText });
	return;
}


