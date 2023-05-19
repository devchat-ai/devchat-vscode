import * as vscode from 'vscode';
import ChatPanel from '../panel/chatPanel';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import { logger } from '../util/logger';
import * as childProcess from 'child_process';
import { DevChatViewProvider } from '../panel/devchatView';
import ExtensionContextHolder from '../util/extensionContext';

import * as process from 'process';

export function checkDevChatDependency(): boolean {
  try {
    // 获取pipx环境信息
    const pipxEnvOutput = childProcess.execSync('python3 -m pipx environment').toString();
    const binPathRegex = /PIPX_BIN_DIR=\s*(.*)/;

    // 提取BIN路径
    const match = pipxEnvOutput.match(binPathRegex);
    if (match && match[1]) {
      const binPath = match[1];

      // 将BIN路径添加到环境变量中
      process.env.PATH = `${binPath}:${process.env.PATH}`;

      // 检查devchat是否已经安装
      childProcess.execSync('devchat --help');
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // 命令执行失败，依赖程序未安装或其他异常
    return false;
  }
}

export async function checkOpenAiAPIKey() {
	const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
	let openaiApiKey = await secretStorage.get("devchat_OPENAI_API_KEY");
	if (!openaiApiKey) {
		openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('OpenAI.apiKey');
	}
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		return false;
	}
	return true;
}

function checkOpenAIKey() {
	let openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('OpenAI.apiKey');
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		// openAI key 未设置，请用户输入API Key
		vscode.window.showInputBox({
			placeHolder: 'Please input your openAI API Key'
		}).then((value) => {
			if (value) {
				// 设置用户输入的API Key
				vscode.workspace.getConfiguration('DevChat').update('OpenAI.apiKey', value, true);
			}
		});
		return false;
	}
	return true;
}

function checkDependencyPackage() {
	const dependencyInstalled = checkDevChatDependency();
	if (!dependencyInstalled) {
		// Prompt the user, whether to install devchat using pip3 install devchat
		const installPrompt = 'devchat is not installed. Do you want to install it using pip3 install devchat?';
		const installAction = 'Install';

		vscode.window.showInformationMessage(installPrompt, installAction).then((selectedAction) => {
			if (selectedAction === installAction) {
				// Install devchat using pip3 install devchat
				const terminal = vscode.window.createTerminal("DevChat Install");
				terminal.sendText("pip3 install --upgrade devchat");
				terminal.show();
			}
		});
	}

	if (!checkOpenAIKey()) {
		return;
	}
}

function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('devchat.openChatPanel',async () => {
		await vscode.commands.executeCommand('devchat-view.focus');
    });
    context.subscriptions.push(disposable);
}

async function ensureChatPanel(context: vscode.ExtensionContext): Promise<boolean> {
    await vscode.commands.executeCommand('devchat-view.focus');
    return true;
}

function registerAddContextCommand(context: vscode.ExtensionContext) {
    const disposableAddContext = vscode.commands.registerCommand('devchat.addConext', async (uri: { path: any; }) => {
        if (!await ensureChatPanel(context)) {
            return;
        }

        await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, uri.path);
    });
    context.subscriptions.push(disposableAddContext);

	const disposableAddContextChinese = vscode.commands.registerCommand('devchat.addConext_chinese', async (uri: { path: any; }) => {
        if (!await ensureChatPanel(context)) {
            return;
        }

        await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, uri.path);
    });
    context.subscriptions.push(disposableAddContextChinese);
}

function registerAskForCodeCommand(context: vscode.ExtensionContext) {
    const disposableCodeContext = vscode.commands.registerCommand('devchat.askForCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!await ensureChatPanel(context)) {
                return;
            }

            const selectedText = editor.document.getText(editor.selection);
            await sendCodeSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName, selectedText);
        }
    });
    context.subscriptions.push(disposableCodeContext);

	const disposableCodeContextChinese = vscode.commands.registerCommand('devchat.askForCode_chinese', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!await ensureChatPanel(context)) {
                return;
            }

            const selectedText = editor.document.getText(editor.selection);
            await sendCodeSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName, selectedText);
        }
    });
    context.subscriptions.push(disposableCodeContextChinese);
}

function registerAskForFileCommand(context: vscode.ExtensionContext) {
    const disposableAskFile = vscode.commands.registerCommand('devchat.askForFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!await ensureChatPanel(context)) {
                return;
            }

            await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName);
        }
    });
    context.subscriptions.push(disposableAskFile);

	const disposableAskFileChinese = vscode.commands.registerCommand('devchat.askForFile_chinese', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!await ensureChatPanel(context)) {
                return;
            }

            await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName);
        }
    });
    context.subscriptions.push(disposableAskFileChinese);
}

export {
	checkDependencyPackage,
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
};
