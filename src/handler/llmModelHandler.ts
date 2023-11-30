import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';


regInMessage({command: 'regModelList'});
regOutMessage({command: 'regModelList', result: [{name: ''}]});
export async function getValidLlmModelList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const modelList = await ApiKeyManager.getValidModels();
	
	MessageHandler.sendMessage(panel, { command: 'regModelList', result: modelList });
	return;
}


