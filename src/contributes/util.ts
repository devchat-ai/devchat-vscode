import * as vscode from 'vscode';

import { handleCodeSelected } from '../context/contextCodeSelected';
import { handleFileSelected } from '../context/contextFileSelected';
import { MessageHandler } from '../handler/messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';

regOutMessage({command: 'appendContext', context: ''});
export async function sendFileSelectMessage(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
	const codeContext = await handleFileSelected(filePath);
	MessageHandler.sendMessage(panel, { command: 'appendContext', context: codeContext });
}

regOutMessage({command: 'appendContext', context: ''});
export async function sendCodeSelectMessage(panel: vscode.WebviewPanel, filePath: string, codeBlock: string): Promise<void> {
	const codeContext = await handleCodeSelected(filePath, codeBlock);
	MessageHandler.sendMessage(panel, { command: 'appendContext', context: codeContext });
}