import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';


async function replaceFileContent(uri: vscode.Uri, newContent: string) {
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

regInMessage({command: 'code_file_apply', content: '', fileName: ''});
export async function codeFileApply(message: any, panel: vscode.WebviewPanel): Promise<void> {
	await applyCodeFile(message.content, message.fileName);
	return;
}


