import * as vscode from 'vscode';
import { getInMessages, getOutMessages } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';

export async function listAllMessages(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const inMessages = getInMessages()
	const outMessages = getOutMessages()

	MessageHandler.sendMessage(panel, { command: 'InMessage', result: inMessages });
	MessageHandler.sendMessage(panel, { command: 'OutMessage', result: outMessages });
	return;
}
