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


regInMessage({command: 'openLink', url: 'http://...'}); // when key is "", it will rewrite all config values
export async function openLink(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const url = message.url;
    vscode.env.openExternal(vscode.Uri.parse(url));
}