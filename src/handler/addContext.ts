import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';

import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';


regInMessage({command: 'addContext', selected: ''});
regOutMessage({command: 'appendContext', context: ''});
export async function addConext(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const contextStrList = await ChatContextManager.getInstance().processText(message.selected);
    for (const contextStr of contextStrList) {
		MessageHandler.sendMessage(panel, { command: 'appendContext', context: contextStr });
	}
}


