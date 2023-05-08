import * as vscode from 'vscode';
import DevChat, { LogOptions } from '../toolwrapper/devchat';


export async function historyMessages(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const devChat = new DevChat();

	const logOptions: LogOptions = message.options || {};
	const logEntries = await devChat.log(logOptions);
	panel.webview.postMessage({ command: 'loadHistoryMessages', entries: logEntries });
	return;
}


