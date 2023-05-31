import * as vscode from 'vscode';

import ExtensionContextHolder from './extensionContext';
import { UiUtil } from './uiUtil';


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
		const terminal = vscode.window.createTerminal(terminalName);
		terminal.sendText(command);
		terminal.show();
	}
}
