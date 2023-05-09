import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';

import { MessageHandler } from './messageHandler';

export async function addConext(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const contextStr = await ChatContextManager.getInstance().processText(message.selected);
    MessageHandler.sendMessage(panel, { command: 'appendContext', context: contextStr });
	return;
}


