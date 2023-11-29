import * as vscode from 'vscode';

import { handleCodeSelected } from '../context/contextCodeSelected';
import { handleFileSelected } from '../context/contextFileSelected';
import { MessageHandler } from '../handler/messageHandler';
import { regOutMessage } from '../util/reg_messages';
import { logger } from '../util/logger';

regOutMessage({command: 'appendContext', context: ''});
export async function sendFileSelectMessage(panel: vscode.WebviewPanel|vscode.WebviewView, filePath: string): Promise<void> {
	logger.channel()?.info(`File selected: ${filePath}`);
	const codeContext = await handleFileSelected(filePath);
	MessageHandler.sendMessage(panel, { command: 'appendContext', context: codeContext });
}

regOutMessage({command: 'appendContext', context: ''});
export async function sendCodeSelectMessage(panel: vscode.WebviewPanel|vscode.WebviewView, filePath: string, codeBlock: string, startLine: number): Promise<void> {
	logger.channel()?.info(`File selected: ${filePath}`);
	const codeContext = await handleCodeSelected(filePath, codeBlock, startLine);
	MessageHandler.sendMessage(panel, { command: 'appendContext', context: codeContext });
}