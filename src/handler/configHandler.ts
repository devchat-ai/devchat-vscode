/*
Commands for handling configuration read and write
*/

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import yaml from 'yaml';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';
import { DevChatConfig } from '../util/config';
import { logger } from '../util/logger';


// 读取YAML配置文件的函数
function readYamlConfigFile(configFilePath: string): any {
    try {
        // 如果配置文件不存在，创建一个空文件
        if (!fs.existsSync(configFilePath)) {
            fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
            fs.writeFileSync(configFilePath, '', 'utf8');
        }

        const fileContents = fs.readFileSync(configFilePath, 'utf8');
        const data = yaml.parse(fileContents) || {};

        return data;
    } catch (error) {
        logger.channel()?.error(`Error reading the config file: ${error}`);
        logger.channel()?.show();
        return {};
    }
}

// 写入YAML配置文件的函数
function writeYamlConfigFile(configFilePath: string, data: any): void {
    try {
        const yamlStr = yaml.stringify(data);
        fs.writeFileSync(configFilePath, yamlStr, 'utf8');
    } catch (error) {
        logger.channel()?.error(`Error writing the config file: ${error}`);
        logger.channel()?.show();
    }
}

regInMessage({command: 'readConfig', key: ['A','B']}); // when key is "", it will get all config values 
regOutMessage({command: 'readConfig', key: ['A', 'B'], value: 'any'});
export async function readConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '' || message.key === '*' || message.key.length === 0 || message.key[1] === '*') {
        const config = DevChatConfig.getInstance().getAll();
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    } else {
        const config = DevChatConfig.getInstance().get(message.key);
        MessageHandler.sendMessage(panel, {command: 'readConfig', key: message.key, value: config});
    }
}

regInMessage({command: 'writeConfig', key: ['A', 'B'], value: 'any'}); // when key is "", it will rewrite all config values
export async function writeConfig(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    if (message.key === '' || message.key === '*' || message.key.length === 0 || message.key[1] === '*') {
        DevChatConfig.getInstance().setAll(message.value);
    } else {
        DevChatConfig.getInstance().set(message.key, message.value);
    }
}

regInMessage({command: 'readServerConfigBase', key: ['A','B']}); // when key is "", it will get all config values 
regOutMessage({command: 'readServerConfigBase', key: ['A', 'B'], value: 'any'});
export async function readServerConfigBase(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const serverConfigFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.chat', 'server_config.yml');
    const config = readYamlConfigFile(serverConfigFile);
    if (!config) {
        MessageHandler.sendMessage(panel, {command: 'readServerConfigBase', value: {}});
    } else {
        MessageHandler.sendMessage(panel, {command: 'readServerConfigBase', value: config});
    }
}

regInMessage({command: 'writeServerConfigBase', key: ['A', 'B'], value: 'any'}); // when key is "", it will rewrite all config values
export async function writeServerConfigBase(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const serverConfigFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.chat', 'server_config.yml');
    const config = message.value;
    writeYamlConfigFile(serverConfigFile, config);
}