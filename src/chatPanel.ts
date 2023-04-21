import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { chatWithGPT } from './openaiClient';

export default class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _session_id: string;
  private _messageHistory: Array<{ role: string; content: string }>;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      'chatPanel',
      'Chat Panel',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    );

    // Set the webview's initial HTML content
    new ChatPanel(panel, extensionUri, uuidv4()));
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, session_id: string) {
    // ... initialize the chat panel ...
    this._panel = panel;
    this._session_id = session_id;
    this._messageHistory = [];

    // Set the webview options
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };

    // Set the webview content
    this._panel.webview.html = this._getHtmlContent(extensionUri);

    // Handle webview events and dispose of the panel when closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            const [status, response] = await chatWithGPT(message.text, this._session_id, this._messageHistory);
            if (status == 0) {
              this._messageHistory.push({ role: 'user', content: message.text });
              this._messageHistory.push({ role: 'assistant', content: response });
            }
            this._panel.webview.postMessage({ command: 'receiveMessage', text: response });
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private _getHtmlContent(extensionUri: vscode.Uri): string {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'chatPanel.html');
    const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Replace the resource placeholder with the correct resource URI
    return htmlContent.replace(/<vscode-resource:(\/.+?)>/g, (_, resourcePath) => {
      const resourceUri = vscode.Uri.joinPath(extensionUri, 'media', resourcePath);
      return this._panel.webview.asWebviewUri(resourceUri).toString();
    });
  }

  public dispose() {
    // ... dispose the panel and clean up resources ...
  }

  // ... other helper methods ...
}