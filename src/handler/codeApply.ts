import * as vscode from 'vscode';
import { messageHandler } from './messageHandler';


export async function applyCode(text: string) {
	if (vscode.window.visibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
		return;
	}

	const editor = vscode.window.visibleTextEditors[0];
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const start = selection.start;
	const end = selection.end;

	await editor.edit((editBuilder: vscode.TextEditorEdit) => {
		editBuilder.replace(new vscode.Range(start, end), text);
	});
}


async function codeApply(message: any, panel: vscode.WebviewPanel): Promise<void> {
	await applyCode(message.content);
	return;
}

messageHandler.registerHandler('code_apply', codeApply);

