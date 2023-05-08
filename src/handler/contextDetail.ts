import * as vscode from 'vscode';
import * as fs from 'fs';
import { handleRefCommand } from '../context/contextRef';

// message: { command: 'contextDetail', file: string }
// read detail context information from file
// return json string
export async function contextDetail(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const fileContent = fs.readFileSync(message.file, 'utf-8');
    panel.webview.postMessage({ command: 'contextDetailResponse', result: fileContent });  
	return;
}
