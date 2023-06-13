import * as vscode from 'vscode';

import ExtensionContextHolder from './extensionContext';
import { UiUtil } from './uiUtil';
import { logger } from './logger';


export class UiUtilVscode implements UiUtil {
	public async languageId(uri: string): Promise<string> {
		const document = await vscode.workspace.openTextDocument(uri);
		return document.languageId;
	}
	public workspaceFoldersFirstPath(): string | undefined {
		return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	}

	public getConfiguration(key1: string, key2: string): string | undefined {
		return vscode.workspace.getConfiguration(key1).get(key2);
	}
	public async secretStorageGet(key: string): Promise<string | undefined> {
		const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
		let openaiApiKey = await secretStorage.get(key);
		return openaiApiKey;
	}
	public async writeFile(uri: string, content: string): Promise<void> {
		await vscode.workspace.fs.writeFile(vscode.Uri.file(uri), Buffer.from(content));
	}
	public async showInputBox(option: object): Promise<string | undefined> {
		return vscode.window.showInputBox(option);		
	}
	public async storeSecret(key: string, value: string): Promise<void> {
		const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
		await secretStorage.store(key, value);
	}
	public extensionPath(): string {
		return ExtensionContextHolder.context!.extensionUri.fsPath;
	}
	public runTerminal(terminalName: string, command: string): void {
		const terminals = vscode.window.terminals;
		for (const terminal of terminals) {
			if (terminal.name === terminalName) {
				terminal.dispose();
			}
		}
		const terminal = vscode.window.createTerminal(terminalName);
		terminal.sendText(command);
		terminal.show();
	}

	// current active file path
	public activeFilePath(): string | undefined {
		const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

		if (validVisibleTextEditors.length > 1) {
			vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
			return undefined;
		}

		const editor = validVisibleTextEditors[0];
		if (!editor) {
			return undefined;
		}

		return editor.document.fileName;
	}
	// current selected range, return undefined if no selection 
	public selectRange(): [number, number] | undefined {
		const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

		if (validVisibleTextEditors.length > 1) {
			vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
			return undefined;
		}

		const editor = validVisibleTextEditors[0];
		if (!editor) {
			return undefined;
		}

		if (editor.selection.isEmpty) {
			return undefined;
		}

		return [editor.selection.start.character, editor.selection.end.character];
	}
	// current selected text
	public selectText(): string | undefined {
		const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

		if (validVisibleTextEditors.length > 1) {
			vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
			return undefined;
		}

		const editor = validVisibleTextEditors[0];
		if (!editor) {
			return undefined;
		}

		if (editor.selection.isEmpty) {
			return undefined;
		}

		return editor.document.getText(editor.selection);
	}

	public showErrorMessage(message: string): void {
		vscode.window.showErrorMessage(message);
	}
}
