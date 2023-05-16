import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';


regInMessage({command: 'convertCommand', text: ''});
regOutMessage({command: 'convertCommand', result: ''});
export async function convertCommand(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const newText = await CommandManager.getInstance().processText(message.text);
	MessageHandler.sendMessage(panel, { command: 'convertCommand', result: newText });
	return;
}


