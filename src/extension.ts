import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ncp from 'ncp'; // 需要安装 ncp 模块，用于复制目录

const ChatPanel = require('./chatPanel').default;
const sendFileSelectMessage = require('./messageHandler').sendFileSelectMessage;
const sendCodeSelectMessage = require('./messageHandler').sendCodeSelectMessage;
import ExtensionContextHolder from './extensionContext';

function createChatDirectoryAndCopyInstructionsSync(extensionUri: vscode.Uri) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const chatDirPath = path.join(workspaceRoot, '.chat');
  const instructionsSrcPath = path.join(extensionUri.fsPath, 'instructions');

  try {
    // 检查 .chat 目录是否存在，如果不存在，则创建它
    if (!fs.existsSync(chatDirPath)) {
      fs.mkdirSync(chatDirPath);
    } else {
      return;
    }

    // 将 instructions 目录复制到 .chat 目录中
    ncp.ncp(instructionsSrcPath, path.join(chatDirPath, 'instructions'), (err) => {
      if (err) {
        console.error('Error copying instructions:', err);
      }
    });
  } catch (error) {
    console.error('Error creating .chat directory and copying instructions:', error);
  }
}

function activate(context: vscode.ExtensionContext) {
  ExtensionContextHolder.context = context;

  // 创建 .chat 目录并复制 instructions
  createChatDirectoryAndCopyInstructionsSync(context.extensionUri);

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
