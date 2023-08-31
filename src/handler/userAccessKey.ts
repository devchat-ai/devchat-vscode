/*
Update config
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { UiUtilWrapper } from '../util/uiUtil';
import { MessageHandler } from './messageHandler';
import { ApiKeyManager } from '../util/apiKey';

regInMessage({command: 'getUserAccessKey', key1: "DevChat", key2: "OpenAI"});
regOutMessage({command: 'getUserAccessKey', accessKey: "DC.xxx", keyType: "DevChat", endPoint: "https://xxx"});
export async function getUserAccessKey(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		let openaiApiKey = await ApiKeyManager.getApiKey();
		if (!openaiApiKey) {
			MessageHandler.sendMessage(panel, {"command": "getUserAccessKey", "accessKey": "", "keyType": "", "endPoint": ""});
			return;
		}

		let keyType = ApiKeyManager.getKeyType(openaiApiKey!);
		if (keyType === "DC") {
			keyType = "DevChat";
		} else if (keyType === "sk") {
			keyType = "OpenAI";
		}

		let openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
		if (!openAiApiBase) {
			openAiApiBase = "";
		}
		MessageHandler.sendMessage(panel, {"command": "getUserAccessKey", "accessKey": openaiApiKey, "keyType": keyType, "endPoint": openAiApiBase});
}