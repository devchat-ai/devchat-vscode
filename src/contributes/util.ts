import * as vscode from 'vscode';

import { handleCodeSelected } from '../context/contextCodeSelected';
import { handleFileSelected } from '../context/contextFileSelected';

export async function sendFileSelectMessage(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
	const codeContext = await handleFileSelected(filePath);
	panel.webview.postMessage({ command: 'appendContext', context: codeContext });
  }
  
  export async function sendCodeSelectMessage(panel: vscode.WebviewPanel, filePath: string, codeBlock: string): Promise<void> {
	const codeContext = await handleCodeSelected(filePath, codeBlock);
	panel.webview.postMessage({ command: 'appendContext', context: codeContext });
  }