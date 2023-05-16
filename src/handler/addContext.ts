import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';

import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';


regInMessage({command: 'addContext', selected: ''});
regOutMessage({command: 'appendContext', context: ''});
export async function addConext(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const contextStr = await ChatContextManager.getInstance().processText(message.selected);
    MessageHandler.sendMessage(panel, { command: 'appendContext', context: contextStr });
	return;
}


