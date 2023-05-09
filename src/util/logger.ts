import * as vscode from 'vscode'

export class logger {
	private static _channel: vscode.OutputChannel | undefined;
	public static init(context: vscode.ExtensionContext): void {
		this._channel = vscode.window.createOutputChannel('DevChat');
		this.log('DevChat is active');
	}
	public static log(text: string): void {
		if (this._channel) {
			this._channel.appendLine(text);
		}
	}
}

