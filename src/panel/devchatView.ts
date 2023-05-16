import * as vscode from 'vscode';
import WebviewManager from './webviewManager';

import '../handler/loadHandlers';
import handleMessage from '../handler/messageHandler';


export class DevChatViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _webviewManager: WebviewManager|undefined;

	constructor(private readonly _context: vscode.ExtensionContext) {
		// Subscribe to the onDidChangeWorkspaceFolders event
		vscode.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders, this, _context.subscriptions);
	}

	public view() {
		return this._view;
	}
  
	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
	  this._view = webviewView;
  
	  this._webviewManager = new WebviewManager(webviewView.webview, this._context.extensionUri);
	  
	  this.registerEventListeners();
	}

	private registerEventListeners() {
		// this._view?.onDidDispose(() => this.dispose(), null, this._disposables);

		this._view?.webview.onDidReceiveMessage(
			async (message) => {
				handleMessage(message, this._view!);
			},
			null,
			this._context.subscriptions
		);
	}

	private onDidChangeWorkspaceFolders(event: vscode.WorkspaceFoldersChangeEvent): void {
		// Check if any folder was added or removed
		if (event.added.length > 0 || event.removed.length > 0) {
		  // Update the webviewView content
		  vscode.window.showInformationMessage(`onDidChangeWorkspaceFolders`);
		//   this.updateWebviewContent();
		}
	}

	// public dispose() {
	// 	ChatPanel._instance = undefined;
	// 	this._panel.dispose();
	// 	while (this._disposables.length) {
	// 		const disposable = this._disposables.pop();
	// 		if (disposable) {
	// 			disposable.dispose();
	// 		}
	// 	}
	// }

  }