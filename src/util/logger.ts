import * as vscode from 'vscode';

export class logger {
	private static _channel: vscode.LogOutputChannel | undefined;
	public static init(context: vscode.ExtensionContext): void {
		this._channel = vscode.window.createOutputChannel('DevChat', { log: true });
	}

	public static channel(): vscode.LogOutputChannel | undefined {
		return this._channel;
	}
}

