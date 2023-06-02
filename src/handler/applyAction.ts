import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import ActionManager from '../action/actionManager';


regInMessage({command: 'applyAction', actionName: '', codeBlock: { type: '', content: '', fileName: ''}});
export async function applyAction(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	ActionManager.getInstance().applyAction(message.actionName, message.codeBlock);
}


