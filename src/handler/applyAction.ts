import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import ActionManager from '../action/actionManager';
import { MessageHandler } from './messageHandler';
import { sendMessage } from './sendMessage';
import { logger } from '../util/logger';

function compressText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
	  return text;
	}
  
	const halfLength = Math.floor(maxLength / 2);
	return text.slice(0, halfLength) + " ... " + text.slice(-halfLength);
}


regInMessage({command: 'applyAction', actionName: '', codeBlock: { type: '', content: '', fileName: ''}});
export async function applyAction(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	try {
		const result = await ActionManager.getInstance().applyAction(message.actionName, message.codeBlock);
		if (message.codeBlock.type === 'command') {
			// send error message to devchat
			const newMessage = `run command: ${compressText(message.codeBlock.content, 100)}, result: {"exit_code": ${result.exitCode}, stdout: ${compressText(result.stdout, 100)}, stderr: ${compressText(result.stderr, 100)}}. Next step`;
			MessageHandler.sendMessage(panel, { "command": "sendMessageSystem" });
			sendMessage({command: 'sendMessage', text: newMessage}, panel);
		}
	} catch (error) {
		logger.channel()?.error('Failed to parse code file content: ' + error);
		logger.channel()?.show();
	}
}


