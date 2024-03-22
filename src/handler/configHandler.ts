/*
Commands for handling configuration read and write
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';
import { DevChatConfig } from '../util/config';

regInMessage({command: 'readConfig', key: ['A','B']}); // when key is "", it will get all config values 
regOutMessage({command: 'readConfig', key: ['A', 'B'], value: 'any'});
export async function readConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '' || message.key === '*' || message.key.length === 0 || message.key[1] === '*') {
        const config = new DevChatConfig().getAll();
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    } else {
        const config = new DevChatConfig().get(message.key);
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    }
}

regInMessage({command: 'writeConfig', key: ['A', 'B'], value: 'any'}); // when key is "", it will rewrite all config values
export async function writeConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '' || message.key === '*' || message.key.length === 0 || message.key[1] === '*') {
        new DevChatConfig().setAll(message.value);
    } else {
        new DevChatConfig().set(message.key, message.value);
    }
}