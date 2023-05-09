import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';
import { MessageHandler } from './messageHandler';

export async function regContextList(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const contextList = ChatContextManager.getInstance().getContextList();
    MessageHandler.sendMessage(panel, { command: 'regContextList', result: contextList });
    return;
}


