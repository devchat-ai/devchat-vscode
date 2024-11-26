// messageHandler.ts

import * as vscode from 'vscode';

import { logger } from '../util/logger';
import { ExtensionContextHolder } from '../util/extensionContext';


export class MessageHandler {
	private handlers: { [command: string]: (message: any, panel: vscode.WebviewPanel|vscode.WebviewView) => Promise<void> } = {};

	constructor() {
	}

	registerHandler(command: string, handler: (message: any, panel: vscode.WebviewPanel|vscode.WebviewView) => Promise<void>): void {
		this.handlers[command] = handler;
	}

	async handleMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
		try {
			let isNeedSendResponse = this.shouldSendResponse(message);

			const handler = this.handlers[message.command];
			if (handler) {
				logger.channel()?.trace(`Handling the command "${message.command}"`);
				await handler(message, panel);
				logger.channel()?.trace(`Handling the command "${message.command}" done`);
			} else {
				logger.channel()?.warn(`No handler found for the command "${message.command}"`);
				logger.channel()?.show();
			}

			if (isNeedSendResponse) {
				MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: 'finish', hash: '', user: '', date: 1, isError: false });
			}
		} catch (e) {
			logger.channel()?.warn(`Error handling the message: "${JSON.stringify(message)}"`);
			logger.channel()?.show();
		}
	}

	private shouldSendResponse(message: any): boolean {
		if (message.command === 'sendMessage') {
			try {
				const messageObject = JSON.parse(message.text);
				if (messageObject && messageObject.user && messageObject.user === 'merico-devchat') {
					message = messageObject; // Update the message reference
					return !messageObject.hasResponse;
				}
			} catch (e) {
				// Silence JSON parse error, log if necessary
			}
		}
		return false;
	}

	public static sendMessage(panel: vscode.WebviewPanel|vscode.WebviewView, message : any, log: boolean = true): void {
		if (log) {
			logger.channel()?.trace(`Message to GUI: "${JSON.stringify(message)}"`);
		}
		
		panel.webview.postMessage(message);
	}

	public static sendMessage2(message : any, log: boolean = true): void {
		if (log) {
			logger.channel()?.trace(`Message to GUI: "${JSON.stringify(message)}"`);
		}
		
		const panel = ExtensionContextHolder.provider?.view()!;
		if (!panel) {
			logger.channel()?.warn(`No panel found to send message: "${JSON.stringify(message)}"`);
			return;
		}
		panel.webview.postMessage(message);
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
