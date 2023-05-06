import * as vscode from 'vscode';
import { messageHandler } from './messageHandler';



export async function applyCodeFile(text: string) {
	if (vscode.window.visibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
		return;
	}

	const editor = vscode.window.visibleTextEditors[0];
	if (!editor) {
		return;
	}

	const document = editor.document;
	const fullRange = new vscode.Range(
		document.positionAt(0),
		document.positionAt(document.getText().length)
	);

	await editor.edit((editBuilder: vscode.TextEditorEdit) => {
		editBuilder.replace(fullRange, text);
	});
}

async function codeFileApply(message: any, panel: vscode.WebviewPanel): Promise<void> {
	await applyCodeFile(message.content);
	return;
}

messageHandler.registerHandler('code_file_apply', codeFileApply);
