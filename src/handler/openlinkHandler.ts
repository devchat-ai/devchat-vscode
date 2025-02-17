/*
Commands for handling configuration read and write
*/

import * as vscode from 'vscode';
import { regInMessage } from '../util/reg_messages';

regInMessage({command: 'openLink', url: 'http://...'}); // when key is "", it will rewrite all config values
export async function openLink(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const url = message.url;
    vscode.env.openExternal(vscode.Uri.parse(url));
}