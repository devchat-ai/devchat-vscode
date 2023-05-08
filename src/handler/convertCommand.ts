import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';


export async function convertCommand(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const newText = await CommandManager.getInstance().processText(message.text);
	panel.webview.postMessage({ command: 'convertCommand', result: newText });
	return;
}


