// chatPanel.ts

import * as vscode from 'vscode';
import * as path from 'path';
import '../handler/loadHandlers';
import handleMessage from '../handler/messageHandler';
import WebviewManager from './webviewManager';

import CustomCommands from '../command/customCommand';
import CommandManager from '../command/commandManager';
import { createChatDirectoryAndCopyInstructionsSync } from '../init/chatConfig';

export default class ChatPanel {
	private static _instance: ChatPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _webviewManager: WebviewManager;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		// 创建 .chat 目录并复制 workflows
		createChatDirectoryAndCopyInstructionsSync(extensionUri);

		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		if (workspaceDir) {
			const workflowsDir = path.join(workspaceDir!, '.chat', 'workflows');
			CustomCommands.getInstance().parseCommands(workflowsDir);
		}

		if (ChatPanel._instance) {
			ChatPanel._instance._panel.reveal();
		} else {
			const panel = ChatPanel.createWebviewPanel(extensionUri);
			ChatPanel._instance = new ChatPanel(panel, extensionUri);
		}
	}

	public static currentPanel(): ChatPanel | undefined {
		return ChatPanel._instance;
	}

	// Create a new webview panel
	private static createWebviewPanel(extensionUri: vscode.Uri): vscode.WebviewPanel {
		return vscode.window.createWebviewPanel(
			'chatPanel',
			'Chat',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
				retainContextWhenHidden: true
			}
		);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._webviewManager = new WebviewManager(panel.webview, extensionUri);
		this.registerEventListeners();
	}

	public panel(): vscode.WebviewPanel {
		return this._panel;
	}

	// Register event listeners for the panel and webview
	private registerEventListeners() {
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				handleMessage(message, this._panel);
			},
			null,
			this._disposables
		);
	}

	// Dispose the panel and clean up resources
	public dispose() {
		ChatPanel._instance = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
