import * as vscode from 'vscode';


export async function applyCodeFile(text: string) {
	const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

	if (validVisibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`2There are more then one visible text editors. Please close all but one and try again.`);
		return;
	}

	const editor = validVisibleTextEditors[0];
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

export async function codeFileApply(message: any, panel: vscode.WebviewPanel): Promise<void> {
	await applyCodeFile(message.content);
	return;
}


