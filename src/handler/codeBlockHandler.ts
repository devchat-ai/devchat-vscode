import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';


export async function applyCode(text: string) {
	const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

	if (validVisibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
		return;
	}

	const editor = validVisibleTextEditors[0];
	if (!editor) {
		return;
	}

	const selection = editor.selection;
	const start = selection.start;
	const end = selection.end;

	await editor.edit((editBuilder: vscode.TextEditorEdit) => {
		editBuilder.replace(new vscode.Range(start, end), text);
	});

	// Calculate the range of the inserted text
	const insertedRange = new vscode.Range(start, editor.document.positionAt(text.length + editor.document.offsetAt(start)));

	// Check if the inserted text is already within the visible range
	const visibleRanges = editor.visibleRanges;
	const isRangeVisible = visibleRanges.some(range => range.contains(insertedRange));

	// If the inserted text is not visible, reveal it
	if (!isRangeVisible) {
		editor.revealRange(insertedRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}
}



export async function applyCodeFile(text: string, fileName: string): Promise<void> {
	if (fileName) {
		await replaceFileContent(vscode.Uri.file(fileName), text);
		return;
	}

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
export async function replaceFileContent(uri: vscode.Uri, newContent: string) {
	try {
		// 创建一个 WorkspaceEdit 对象
		const workspaceEdit = new vscode.WorkspaceEdit();

		// 获取文件的当前内容
		const document = await vscode.workspace.openTextDocument(uri);

		// 计算文件的完整范围（从文件开始到文件结束）
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length)
		);

		// 使用 WorkspaceEdit 的 replace 方法替换文件的完整范围内容
		workspaceEdit.replace(uri, fullRange, newContent);

		// 应用编辑更改
		await vscode.workspace.applyEdit(workspaceEdit);

		// 显示成功消息
		vscode.window.showInformationMessage('File content replaced successfully.');
	} catch (error) {
		// 显示错误消息
		vscode.window.showErrorMessage('Failed to replace file content: ' + error);
	}
}


regInMessage({command: 'code_apply', content: ''});
export async function insertCodeBlockToFile(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	await applyCode(message.content);
}

regInMessage({command: 'code_file_apply', content: '', fileName: ''});
export async function replaceCodeBlockToFile(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
	await applyCodeFile(message.content, message.fileName);
}

export async function createAndOpenFile(message: any) {
	const document =await vscode.workspace.openTextDocument({
		language:message.language,
		content: message.content
	});        
	await vscode.window.showTextDocument(document);
}