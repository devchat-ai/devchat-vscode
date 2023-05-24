// messageHandler.ts

import * as vscode from 'vscode';

import '../command/loadCommands';
import '../context/loadContexts';
import { logger } from '../util/logger';
import { on } from 'events';
import { isWaitForApiKey, onApiKey } from './historyMessages';


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
			if (await isWaitForApiKey()) {
				onApiKey(message.text, panel);
				return;
			}
		}

		const handler = this.handlers[message.command];
		if (handler) {
			logger.channel()?.info(`Handling command "${message.command}"`);
			await handler(message, panel);
			logger.channel()?.info(`Handling command "${message.command}" done`);
		} else {
			logger.channel()?.error(`No handler found for command "${message.command}"`);
			logger.channel()?.show();
		}

		if (isNeedSendResponse) {
			MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: 'finish', hash: '', user: '', date: 1, isError: false });
		}
	}

	public static sendMessage(panel: vscode.WebviewPanel|vscode.WebviewView, message: object, log: boolean = true): void {
		if (log) {
			logger.channel()?.info(`Sending message "${JSON.stringify(message)}"`);
		}
		panel.webview.postMessage(message);
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
