import * as vscode from 'vscode';
import DevChat, { LogOptions } from '../toolwrapper/devchat';
import { MessageHandler } from './messageHandler';

export async function historyMessages(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const devChat = new DevChat();

	const logOptions: LogOptions = message.options || {};
	const logEntries = await devChat.log(logOptions);
	MessageHandler.sendMessage(panel, { command: 'loadHistoryMessages', entries: logEntries });
	return;
}


