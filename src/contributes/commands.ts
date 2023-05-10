import * as vscode from 'vscode';
import ChatPanel from '../panel/chatPanel';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import { logger } from '../util/logger';
import * as childProcess from 'child_process';


function checkDependency() {
	// 执行系统命令，检查依赖程序是否已经安装
	try {
	  const result = childProcess.execSync('devchat --help');
	  // 命令执行成功，依赖程序已经安装
	  return true;
	} catch (error) {
	  // 命令执行失败，依赖程序未安装
	  return false;
	}
}

function checkOpenAIKey() {
	let openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('OpenAI.apiKey');
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		logger.channel()?.error('openAI key is invalid!');
		logger.channel()?.info('You can set openAI key in Settings/DevChat, or export OPENAI_API_KEY to env.');
		logger.channel()?.show();
		vscode.window.showErrorMessage('openAI key is invalid!');
		return false;
	}
	return true;
}

function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('devchat.openChatPanel', () => {
        const dependencyInstalled = checkDependency();
		if (!dependencyInstalled) {
			// 依赖程序未安装，显示提示信息
			logger.channel()?.error('devchat package is not installed.');
			logger.channel()?.info('Please install devchat package first. Use command: pip install devchat');
			logger.channel()?.show();
			vscode.window.showErrorMessage('devchat package is not installed.');
			return;
		}

		if (!checkOpenAIKey()) {
			return;
		}

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
    const disposableAddContext = vscode.commands.registerCommand('devchat.addConext', async (uri: { path: any; }) => {
        if (!ensureChatPanel(context)) {
            return;
        }

        await sendFileSelectMessage(ChatPanel.currentPanel()!.panel(), uri.path);
    });
    context.subscriptions.push(disposableAddContext);
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
