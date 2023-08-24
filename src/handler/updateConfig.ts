/*
Update config
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';

regInMessage({command: 'updateSetting', key1: "DevChat", key2: "OpenAI", value:"xxxx"});
export async function updateSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    UiUtilWrapper.updateConfiguration(message.key1, message.key2, message.value);
}

regInMessage({command: 'getSetting', key1: "DevChat", key2: "OpenAI"});
export async function getSetting(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    UiUtilWrapper.getConfiguration(message.key1, message.key2);
}