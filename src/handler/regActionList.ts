import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import ActionManager from '../action/actionManager';



regInMessage({command: 'regActionList'});
regOutMessage({command: 'regActionList', result: [{name: '', description: '', type: ['', ''], action: ''}]});
export async function regActionList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const actionList = ActionManager.getInstance().getActionList();
	MessageHandler.sendMessage(panel, { command: 'regActionList', result: actionList });
}


