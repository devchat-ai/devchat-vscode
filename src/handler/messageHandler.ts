// messageHandler.ts

import * as vscode from 'vscode';

import '../command/loadCommands';
import '../context/loadContexts';
import { logger } from '../util/logger';
import { isWaitForApiKey } from './historyMessagesBase';
import { onApiKey } from './historyMessages';
import { ApiKeyManager } from '../util/apiKey';
import { regeneration, sendMessage as sendMessageX } from './sendMessage';
import { codeFileApply } from './codeFileApply';
import { applyAction } from './applyAction';
import { FT } from '../util/feature_flags/feature_toggles';

let autox = false;

export class MessageHandler {
	private handlers: { [command: string]: (message: any, panel: vscode.WebviewPanel|vscode.WebviewView) => Promise<void> } = {};

	constructor() {
	}

	registerHandler(command: string, handler: (message: any, panel: vscode.WebviewPanel|vscode.WebviewView) => Promise<void>): void {
		this.handlers[command] = handler;
	}

	

	async handleMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
		let isNeedSendResponse = false;
		if (message.command === 'sendMessage') {
			try {
				const messageText = message.text;
				const messageObject = JSON.parse(messageText);
				if (messageObject && messageObject.user && messageObject.user === 'merico-devchat') {
					message = messageObject;
					isNeedSendResponse = true;
				}
			} catch (e) {
			}
		}
		if (message.command === 'sendMessage') {
			if (await isWaitForApiKey() && !await ApiKeyManager.getApiKey()) {
				onApiKey(message.text, panel);
				return;
			}
		}

		autox = false;
		if (message.command === 'sendMessage') {
			// if "/autox" in message.text, then flag global variable autox to true
			if (message.text.indexOf('/autox') !== -1) {
				autox = true;
			}
			// if "/ask-code" in message.text, then call devchat-ask to get result
			if (FT("ask-code")) {
				if (message.text.indexOf('/ask-code') !== -1) {
					message.command = 'askCode';
					message.text = message.text.replace('/ask-code', '');
				}
			}
		}

		const handler = this.handlers[message.command];
		if (handler) {
			logger.channel()?.info(`Handling the command "${message.command}"`);
			await handler(message, panel);
			logger.channel()?.info(`Handling the command "${message.command}" done`);
		} else {
			logger.channel()?.error(`No handler found for the command "${message.command}"`);
			logger.channel()?.show();
		}

		if (isNeedSendResponse) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: 'finish', hash: '', user: '', date: 1, isError: false });
		}
	}

	public static sendMessage(panel: vscode.WebviewPanel|vscode.WebviewView, message : any, log: boolean = true): void {
		if (log) {
			logger.channel()?.info(`Sending message: "${JSON.stringify(message)}"`);
		}
		
		panel.webview.postMessage(message);

		if (message.command === 'receiveMessage') {
			// if message.isError is true, then regenerate message
			if (message.isError) {
				if (autox) {
					regeneration({}, panel);
				}
			} else {
				// if message.text is ```command\n {xxx} ``` then get xxx
				const messageText = message.text;
				// if messageText match "```command\n ... ```", then parse block content
				const reg = /```command\n([\s\S]*)```/;
				const match = messageText.match(reg);
				if (match) {
					const command = match[1];
					try {
						const commandObject = JSON.parse(command);
						if (!(commandObject && commandObject.name)) {
							logger.channel()?.error(`${command} is not a valid command`);
							logger.channel()?.show();
							return ;
						}

						if (commandObject.name === "fail_task" || commandObject.name === "finish_task") {
							logger.channel()?.info(`Task has finished.`);
							logger.channel()?.show();
							return ;
						}

						applyAction({"content": command, "fileName": "", parentHash: message.hash}, panel);
						
					} catch (e) {
						logger.channel()?.error(`parse ${command} error: ${e}`);
						logger.channel()?.show();

						if (autox) {
							MessageHandler.sendMessage(panel, { "command": "systemMessage", "text": "continue. 并且确认你在围绕最初的任务在执行相关步骤。" });
							sendMessageX({command: 'sendMessage', text: "continue"}, panel);
						}
					}
				} else {
					if (autox) {
						MessageHandler.sendMessage(panel, { "command": "systemMessage", "text": "continue. 并且确认你在围绕最初的任务在执行相关步骤。" });
						sendMessageX({command: 'sendMessage', text: "continue"}, panel);
					}
				}
			}
		}
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
