import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export default class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If the panel already exists, show it in the target column
    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      'chatPanel',
      'Chat with Bot',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Create a new ChatPanel instance and set it as the current panel
    ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    // ... initialize the chat panel ...
    this._panel = panel;

    // Set the webview options
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };

    // Set the webview content
    this._panel.webview.html = this._getHtmlContent(extensionUri);

    // Handle webview events and dispose of the panel when closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

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