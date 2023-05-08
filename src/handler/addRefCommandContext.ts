import * as vscode from 'vscode';
import { handleRefCommand } from '../context/contextRef';

// message: { command: 'addRefCommandContext', refCommand: string }
// User input: /ref ls . then "ls ." will be passed to refCommand
export async function addRefCommandContext(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const contextStr = await handleRefCommand(message.refCommand);
    panel.webview.postMessage({ command: 'appendContext', context: contextStr });  
	return;
}
