
import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';
import { UiUtilWrapper } from '../util/uiUtil';


regInMessage({command: 'regModelList'});
regOutMessage({command: 'regModelList', result: [{name: ''}]});
export async function getValidLlmModelList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const modelList = ["model1", "model2", "model3"];
	
	MessageHandler.sendMessage(panel, { command: 'regModelList', result: modelList });
	return;
}


regInMessage({command: 'updateSetting', key1: "DevChat", key2: "OpenAI", value:"xxxx"});
export async function updateSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    return ;
}


regInMessage({command: 'getSetting', key1: "DevChat", key2: "OpenAI"});
regOutMessage({command: 'getSetting', key1: "DevChat", key2: "OpenAI", value: "GPT-4"});
export async function getSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key2 === "Language") {
        MessageHandler.sendMessage(panel, {"command": "getSetting", "key1": message.key1, "key2": message.key2, "value": "en"});
        return;
    }
    MessageHandler.sendMessage(panel, {"command": "getSetting", "key1": message.key1, "key2": message.key2, "value": "model2"});
}


regInMessage({command: 'getUserAccessKey'});
regOutMessage({command: 'getUserAccessKey', accessKey: "DC.xxx", keyType: "DevChat", endPoint: "https://xxx"});
export async function getUserAccessKey(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	MessageHandler.sendMessage(panel, 
        {
            "command": "getUserAccessKey",
            "accessKey": "",
            "keyType": "",
            "endPoint": ""
        }
    );
    return;
}

