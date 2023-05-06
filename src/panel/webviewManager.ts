import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export default class WebviewManager {
	private _webview: vscode.Webview;
	private _extensionUri: vscode.Uri;

	constructor(webview: vscode.Webview, extensionUri: vscode.Uri) {
		this._webview = webview;
		this._extensionUri = extensionUri;
		this.setWebviewOptions();
		this.setWebviewContent();
	}

	private setWebviewOptions() {
		this._webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')],
		};
	}

	private setWebviewContent() {
		this._webview.html = this._getHtmlContent();
	}

	private _getHtmlContent(): string {
		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'assets', 'chatPanel.html');
		// const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'index.html');
		const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

		return htmlContent.replace(/<vscode-resource:(\/.+?)>/g, (_, resourcePath) => {
			const resourceUri = vscode.Uri.joinPath(this._extensionUri, 'dist', resourcePath);
			return this._webview.asWebviewUri(resourceUri).toString();
		});
	}
}
