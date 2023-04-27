// chatPanel.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import DevChat from './devchat';
import handleMessage from './messageHandler';

export default class ChatPanel {
  private static _instance: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  // Create or reveal the chat panel
  public static createOrShow(extensionUri: vscode.Uri) {
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
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    return vscode.window.createWebviewPanel(
      'chatPanel',
      'Chat',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        retainContextWhenHidden: true
      }
    );
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;

    this.setWebviewOptions(extensionUri);
    this.setWebviewContent(extensionUri);
    this.registerEventListeners();
  }

  // Set webview options
  private setWebviewOptions(extensionUri: vscode.Uri) {
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    };
  }

  // Set webview content
  private setWebviewContent(extensionUri: vscode.Uri) {
    this._panel.webview.html = this._getHtmlContent(extensionUri);
  }

  public panel() : vscode.WebviewPanel {
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

  // Get the HTML content for the panel
  private _getHtmlContent(extensionUri: vscode.Uri): string {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'chatPanel.html');
    const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    return htmlContent.replace(/<vscode-resource:(\/.+?)>/g, (_, resourcePath) => {
      const resourceUri = vscode.Uri.joinPath(extensionUri, 'media', resourcePath);
      return this._panel.webview.asWebviewUri(resourceUri).toString();
    });
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
