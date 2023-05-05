// messageHandler.ts

import * as vscode from 'vscode';

import '../command/loadCommands';
import '../context/loadContexts'


class MessageHandler {
	private handlers: { [command: string]: (message: any, panel: vscode.WebviewPanel) => Promise<void> } = {};

	constructor() {
	}

	registerHandler(command: string, handler: (message: any, panel: vscode.WebviewPanel) => Promise<void>): void {
		this.handlers[command] = handler;
	}

	async handleMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
		const handler = this.handlers[message.command];
		if (handler) {
			await handler(message, panel);
		} else {
			console.error(`No handler found for command "${message.command}"`);
		}
	}

	sendMessage(panel: vscode.WebviewPanel, command: string, data: any): void {
		panel.webview.postMessage({ command, ...data });
	}
}

export const messageHandler = new MessageHandler();
export default messageHandler.handleMessage.bind(messageHandler);
