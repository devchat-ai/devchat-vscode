import * as vscode from 'vscode';
import * as fs from "fs";

import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from "../util/logger";


// New: writeFile message handler
regInMessage({ command: 'writeFile', file: '', content: '' });
// Write content to specified file
export async function writeFile(message: any): Promise<void> {
    try {
        fs.writeFileSync(message.file, message.content, 'utf-8');
        logger.channel()?.info(`File ${message.file} has been written successfully.`);
    } catch (error) {
        logger.channel()?.error(`Error writing file ${message.file}: ${error}`);
    }
}

// New: readFile message handler
regInMessage({ command: 'readFile', file: '' });
regOutMessage({ command: 'readFileResponse', file: '', content: '' });
// Read content from specified file and return it
export async function readFile(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    try {
        const fileContent = fs.readFileSync(message.file, 'utf-8');
        MessageHandler.sendMessage(panel, { command: 'readFileResponse', file: message.file, content: fileContent });
    } catch (error) {
        logger.channel()?.error(`Error reading file ${message.file}: ${error}`);
    }
}
