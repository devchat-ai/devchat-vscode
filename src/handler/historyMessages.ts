import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { historyMessagesBase, onApiKeyBase } from './historyMessagesBase';



regInMessage({command: 'historyMessages', options: { skip: 0, maxCount: 0 }});
regOutMessage({command: 'loadHistoryMessages', entries: [{hash: '',user: '',date: '',request: '',response: '',context: [{content: '',role: ''}]}]});
export async function historyMessages(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const historyMessage = await historyMessagesBase();
	MessageHandler.sendMessage(panel, historyMessage);
}

export async function onApiKey(apiKey: string, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const resMessage = await onApiKeyBase(apiKey);
	MessageHandler.sendMessage(panel, resMessage);
}

