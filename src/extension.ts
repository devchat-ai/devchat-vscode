import * as vscode from 'vscode';
const ChatPanel = require('./chatPanel').default;
const sendFileSelectMessage = require('./messageHandler').sendFileSelectMessage;
const sendCodeSelectMessage = require('./messageHandler').sendCodeSelectMessage;
const askAI = require('./messageHandler').askAI;
import ExtensionContextHolder from './extensionContext';

function activate(context: vscode.ExtensionContext) {
  ExtensionContextHolder.context = context;
  let disposable = vscode.commands.registerCommand('devchat.openChatPanel', () => {
    if (vscode.workspace.workspaceFolders) {
      ChatPanel.createOrShow(context.extensionUri);
    } else {
      vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
    }
  });

  const disposable_add_context = vscode.commands.registerCommand('devchat.addConext', (uri: { path: any; }) => {
    if (!ChatPanel.currentPanel()) {
      if (vscode.workspace.workspaceFolders) {
        ChatPanel.createOrShow(context.extensionUri);
      } else {
        vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
        return
      }
    }

    sendFileSelectMessage(ChatPanel.currentPanel().panel(), uri.path);
  });
  
  const disposableCodeContext = vscode.commands.registerCommand('devchat.askForCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!ChatPanel.currentPanel()) {
        if (vscode.workspace.workspaceFolders) {
          ChatPanel.createOrShow(context.extensionUri);
        } else {
          vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
          return
        }
      }
  
      const selectedText = editor.document.getText(editor.selection);
      sendCodeSelectMessage(ChatPanel.currentPanel().panel(), selectedText);
    }
  });

  const disposableAskFile = vscode.commands.registerCommand('devchat.askForFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!ChatPanel.currentPanel()) {
        if (vscode.workspace.workspaceFolders) {
          ChatPanel.createOrShow(context.extensionUri);
        } else {
          vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
          return
        }
      }
  
      const selectedText = editor.document.getText();
      sendCodeSelectMessage(ChatPanel.currentPanel().panel(), selectedText);
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable_add_context);  
  context.subscriptions.push(disposableCodeContext)
  context.subscriptions.push(disposableAskFile)
}
exports.activate = activate;
