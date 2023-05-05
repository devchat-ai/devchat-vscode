import * as vscode from 'vscode';
import ChatPanel from '../panel/chatPanel';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';

function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('devchat.openChatPanel', () => {
        if (vscode.workspace.workspaceFolders) {
            ChatPanel.createOrShow(context.extensionUri);
        } else {
            vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
        }
    });
    context.subscriptions.push(disposable);
}

function ensureChatPanel(context: vscode.ExtensionContext): boolean {
    if (!ChatPanel.currentPanel()) {
        if (vscode.workspace.workspaceFolders) {
            ChatPanel.createOrShow(context.extensionUri);
        } else {
            vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
            return false;
        }
    }
    return true;
}

function registerAddContextCommand(context: vscode.ExtensionContext) {
    const disposable_add_context = vscode.commands.registerCommand('devchat.addConext', async (uri: { path: any; }) => {
        if (!ensureChatPanel(context)) {
            return;
        }

        await sendFileSelectMessage(ChatPanel.currentPanel()!.panel(), uri.path);
    });
    context.subscriptions.push(disposable_add_context);
}

function registerAskForCodeCommand(context: vscode.ExtensionContext) {
    const disposableCodeContext = vscode.commands.registerCommand('devchat.askForCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!ensureChatPanel(context)) {
                return;
            }

            const selectedText = editor.document.getText(editor.selection);
            await sendCodeSelectMessage(ChatPanel.currentPanel()!.panel(), editor.document.fileName, selectedText);
        }
    });
    context.subscriptions.push(disposableCodeContext);
}

function registerAskForFileCommand(context: vscode.ExtensionContext) {
    const disposableAskFile = vscode.commands.registerCommand('devchat.askForFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!ensureChatPanel(context)) {
                return;
            }

            await sendFileSelectMessage(ChatPanel.currentPanel()!.panel(), editor.document.fileName);
        }
    });
    context.subscriptions.push(disposableAskFile);
}

export {
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
};
