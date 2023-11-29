/*
Update config
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { UiUtilWrapper } from '../util/uiUtil';
import { MessageHandler } from './messageHandler';

regInMessage({command: 'updateSetting', key1: "DevChat", key2: "OpenAI", value:"xxxx"});
export async function updateSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    UiUtilWrapper.updateConfiguration(message.key1, message.key2, message.value);
}

regInMessage({command: 'getSetting', key1: "DevChat", key2: "OpenAI"});
regOutMessage({command: 'getSetting', key1: "DevChat", key2: "OpenAI", value: "GPT-4"});
export async function getSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    MessageHandler.sendMessage(panel, {"command": "getSetting", "key1": message.key1, "key2": message.key2, "value": UiUtilWrapper.getConfiguration(message.key1, message.key2)});
}