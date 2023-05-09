// messageHandler.ts

import * as vscode from 'vscode';

import '../command/loadCommands';
import '../context/loadContexts'
import { logger } from '../util/logger';


export class MessageHandler {
	private handlers: { [command: string]: (message: any, panel: vscode.WebviewPanel) => Promise<void> } = {};

	constructor() {
	}

	registerHandler(command: string, handler: (message: any, panel: vscode.WebviewPanel) => Promise<void>): void {
		this.handlers[command] = handler;
	}

	async handleMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
		const handler = this.handlers[message.command];
		if (handler) {
			logger.channel()?.info(`Handling command "${message.command}"`);
			await handler(message, panel);
			logger.channel()?.info(`Handling command "${message.command}" done`);
		} else {
			logger.channel()?.error(`No handler found for command "${message.command}"`);
			logger.channel()?.show();
		}
	}

	public static sendMessage(panel: vscode.WebviewPanel, message: object, log: boolean = true): void {
		if (log) {
			logger.channel()?.info(`Sending message "${JSON.stringify(message)}"`);
		}
		panel.webview.postMessage(message);
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
