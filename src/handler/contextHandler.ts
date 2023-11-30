import * as vscode from 'vscode';
import * as fs from "fs";

import { ChatContextManager } from '../context/contextManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from "../util/logger";


regInMessage({command: 'addContext', selected: ''});
regOutMessage({command: 'appendContext', context: ''});
export async function addConext(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const contextStrList = await ChatContextManager.getInstance().handleContextSelected(message.selected);
    for (const contextStr of contextStrList) {
		MessageHandler.sendMessage(panel, { command: 'appendContext', context: contextStr });
	}
}

regInMessage({ command: 'contextDetail', file: '' });
regOutMessage({ command: 'contextDetailResponse', file: '', result: '' });
// message: { command: 'contextDetail', file: string }
// read detail context information from file
// return json string
export async function getContextDetail(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
	try {
		const fileContent = fs.readFileSync(message.file, 'utf-8');
		MessageHandler.sendMessage(panel, { command: 'contextDetailResponse', 'file': message.file, result: fileContent });
	} catch (error) {
		logger.channel()?.error(`Error reading file ${message.file}: ${error}`);
	}
}


