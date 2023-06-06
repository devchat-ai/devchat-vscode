
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
	// current active file path
	activeFilePath(): string | undefined;
	// current selected range, return undefined if no selection 
	selectRange(): [number, number] | undefined;
	// current selected text
	selectText(): string | undefined;
	showErrorMessage(message: string): void;
}


export class UiUtilWrapper {
	private static _uiUtil: UiUtil | undefined;
	public static init(uiUtil: UiUtil): void {
		this._uiUtil = uiUtil;
	}

	public static async languageId(uri: string): Promise<string | undefined> {
		return await this._uiUtil?.languageId(uri);
	}
	public static workspaceFoldersFirstPath(): string | undefined {
		return this._uiUtil?.workspaceFoldersFirstPath();
	}
	public static getConfiguration(key1: string, key2: string): string | undefined {
		return this._uiUtil?.getConfiguration(key1, key2);
	}
	public static async secretStorageGet(key: string): Promise<string | undefined> {
		return await this._uiUtil?.secretStorageGet(key);
	}
	public static async writeFile(uri: string, content: string): Promise<void> {
		return await this._uiUtil?.writeFile(uri, content);
	}
	public static async showInputBox(option: object): Promise<string | undefined> {
		return await this._uiUtil?.showInputBox(option);
	}
	public static async storeSecret(key: string, value: string): Promise<void> {
		return await this._uiUtil?.storeSecret(key, value);
	}
	public static extensionPath(): string {
		return this._uiUtil?.extensionPath()!;
	}
	public static runTerminal(terminalName: string, command: string): void {
		this._uiUtil?.runTerminal(terminalName, command);
	}
	// current active file path
	public static activeFilePath(): string | undefined {
		return this._uiUtil?.activeFilePath();
	}
	// current selected range, return undefined if no selection 
	public static selectRange(): [number, number] | undefined {
		return this._uiUtil?.selectRange();
	}
	// current selected text
	public static selectText(): string | undefined {
		return this._uiUtil?.selectText();
	}

	public static showErrorMessage(message: string): void {
		this._uiUtil?.showErrorMessage(message);
	}
}

