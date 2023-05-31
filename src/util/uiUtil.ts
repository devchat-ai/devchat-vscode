import ExtensionContextHolder from './extensionContext';

export interface UiUtil {
	languageId(uri: string): Promise<string>;
	workspaceFoldersFirstPath(): string | undefined;
	getConfiguration(key1: string, key2: string): string | undefined;
	secretStorageGet(key: string): Promise<string | undefined>;
	writeFile(uri: string, content: string): Promise<void>;
	showInputBox(option: object): Promise<string | undefined>;
	storeSecret(key: string, value: string): Promise<void>;
	extensionPath(): string;
	runTerminal(terminalName:string, command: string): void;
}


import * as vscode from 'vscode';
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
		vscode.workspace.fs.writeFile(vscode.Uri.file(uri), Buffer.from(content));
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

export class UiUtilWrapper {
	private static _uiUtil: UiUtil | undefined;
	public static init(uiUtil: UiUtil): void {
		this._uiUtil = uiUtil;
	}

	public static async languageId(uri: string): Promise<string | undefined> {
		return this._uiUtil?.languageId(uri);
	}
	public static workspaceFoldersFirstPath(): string | undefined {
		return this._uiUtil?.workspaceFoldersFirstPath();
	}
	public static getConfiguration(key1: string, key2: string): string | undefined {
		return this._uiUtil?.getConfiguration(key1, key2);
	}
	public static async secretStorageGet(key: string): Promise<string | undefined> {
		return this._uiUtil?.secretStorageGet(key);
	}
	public static async writeFile(uri: string, content: string): Promise<void> {
		return this._uiUtil?.writeFile(uri, content);
	}
	public static async showInputBox(option: object): Promise<string | undefined> {
		return this._uiUtil?.showInputBox(option);
	}
	public static async storeSecret(key: string, value: string): Promise<void> {
		return this._uiUtil?.storeSecret(key, value);
	}
	public static extensionPath(): string {
		return this._uiUtil?.extensionPath()!;
	}
	public static runTerminal(terminalName: string, command: string): void {
		this._uiUtil?.runTerminal(terminalName, command);
	}
}

