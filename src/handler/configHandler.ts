/*
Commands for handling configuration read and write
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';
import { DevChatConfig } from '../util/config';

regInMessage({command: 'readConfig', key: ''}); // when key is "", it will get all config values 
regOutMessage({command: 'readConfig', key: '', value: 'any'});
export async function readConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '*' || message.key === '') {
        const config = new DevChatConfig().getAll();
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    } else {
        const config = new DevChatConfig().get(message.key);
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    }
}

regInMessage({command: 'writeConfig', key: '', value: 'any'}); // when key is "", it will rewrite all config values
export async function writeConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '*' || message.key === '') {
        new DevChatConfig().setAll(message.value);
    } else {
        new DevChatConfig().set(message.key, message.value);
    }
}