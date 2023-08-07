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


regInMessage({command: 'applyAction', actionName: '', parentHash: '', codeBlock: { type: '', content: '', fileName: ''}});
export async function applyAction(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	try {
		const result = await ActionManager.getInstance().applyAction("command_run", { "command": "", "fileName": message.fileName, "content": message.content });
		
			// send error message to devchat
			const commandObj = JSON.parse(message.content)
			const newMessage = `{exit_code: ${result.exitCode}, stdout: ${result.stdout}, stderr: ${result.stderr}}`;
			MessageHandler.sendMessage(panel, { "command": "systemMessage", "text": "waitting command reponse..." });
			sendMessage({command: 'sendMessage', text: newMessage, parent_hash: message.parentHash}, panel, commandObj.name);
		
	} catch (error) {
		logger.channel()?.error('Failed to parse code file content: ' + error);
		logger.channel()?.show();
	}
}


