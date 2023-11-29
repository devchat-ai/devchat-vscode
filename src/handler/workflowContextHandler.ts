import * as vscode from 'vscode';
import { ChatContextManager } from '../context/contextManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';



regInMessage({command: 'regContextList'});
regOutMessage({command: 'regContextList', result: [{name: '', description: ''}]});
export async function getWorkflowContextList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const contextList = ChatContextManager.getInstance().getContextList();
    MessageHandler.sendMessage(panel, { command: 'regContextList', result: contextList });
    return;
}
