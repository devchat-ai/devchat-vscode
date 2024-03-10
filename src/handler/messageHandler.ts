// messageHandler.ts

import * as vscode from 'vscode';

import '../context/loadContexts';
import { logger } from '../util/logger';


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
					if (messageObject.hasResponse) {
						isNeedSendResponse = false;
					}
				}
			} catch (e) {
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
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
