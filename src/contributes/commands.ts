import * as vscode from 'vscode';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import { logger } from '../util/logger';
import * as childProcess from 'child_process';
import ExtensionContextHolder from '../util/extensionContext';
import { TopicManager, Topic } from '../topic/topicManager';
import { TopicTreeDataProvider, TopicTreeItem } from '../panel/topicView';
import { FilePairManager } from '../util/diffFilePairs';


import * as process from 'process';


export function checkDevChatDependency(): boolean {
  try {
    // Get pipx environment
    const pipxEnvOutput = childProcess.execSync('python3 -m pipx environment').toString();
    const binPathRegex = /PIPX_BIN_DIR=\s*(.*)/;

    // Get BIN path from pipx environment
    const match = pipxEnvOutput.match(binPathRegex);
    if (match && match[1]) {
      const binPath = match[1];

      // Add BIN path to PATH
      process.env.PATH = `${binPath}:${process.env.PATH}`;

      // Check if DevChat is installed
      childProcess.execSync('devchat --help');
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // DevChat dependency check failed
    return false;
  }
}

export async function checkOpenaiApiKey() {
	const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context!.secrets;
	let openaiApiKey = await secretStorage.get("devchat_OPENAI_API_KEY");
	if (!openaiApiKey) {
		openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('API_KEY');
	}
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		return false;
	}
	return true;
}

function checkOpenaiKey() {
	let openaiApiKey = vscode.workspace.getConfiguration('DevChat').get('API_KEY');
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		// OpenAI key not set
		vscode.window.showInputBox({
			placeHolder: 'Please input your OpenAI API key (or DevChat access key)'
		}).then((value) => {
			if (value) {
				// 设置用户输入的API Key
				vscode.workspace.getConfiguration('DevChat').update('API_KEY', value, true);
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

	if (!checkOpenaiKey()) {
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

export function registerApiKeySettingCommand(context: vscode.ExtensionContext) {
	const secretStorage: vscode.SecretStorage = context.secrets;
	context.subscriptions.push(
		vscode.commands.registerCommand('DevChat.OPENAI_API_KEY', async () => {
			const passwordInput: string = await vscode.window.showInputBox({
				password: true,
				title: "OPENAI_API_KEY"
			}) ?? '';

			secretStorage.store("devchat_OPENAI_API_KEY", passwordInput);
		})
	);
}

export function registerStatusBarItemClickCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devcaht.onStatusBarClick', async () => {
			await vscode.commands.executeCommand('devchat-view.focus');
		})
	);
}

export function regTopicDeleteCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.deleteTopic', (item: TopicTreeItem) => {
			TopicManager.getInstance().deleteTopic(item.id);
		})
	);
}

export function regAddTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.addTopic', () => {
			const topic = TopicManager.getInstance().createTopic();
			TopicManager.getInstance().setCurrentTopic(topic.topicId);
		})
	);
}

export function regDeleteSelectTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.deleteSelectedTopic', () => {
			const selectedItem = TopicTreeDataProvider.getInstance().selectedItem;
			if (selectedItem) {
				TopicManager.getInstance().deleteTopic(selectedItem.id);
			} else {
				vscode.window.showErrorMessage('No item selected');
			}
		})
	);
}

export function regSelectTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.selectTopic', (item: TopicTreeItem) => {
			TopicTreeDataProvider.getInstance().setSelectedItem(item);
			TopicManager.getInstance().setCurrentTopic(item.id);
		})
	);
}

export function regReloadTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.reloadTopic', async (item: TopicTreeItem) => {
			TopicManager.getInstance().loadTopics();
		})
	);
}

export function regApplyDiffResultCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.applyDiffResult', async (data) => {
			const activeEditor = vscode.window.activeTextEditor;
			const fileName = activeEditor!.document.fileName;

			const [leftUri, rightUri] = FilePairManager.getInstance().findPair(fileName) || [undefined, undefined];
			if (leftUri && rightUri) {
				// 获取对比的两个文件
				const leftDoc = await vscode.workspace.openTextDocument(leftUri);
				const rightDoc = await vscode.workspace.openTextDocument(rightUri);

				// 将右边文档的内容替换到左边文档
				const leftEditor = await vscode.window.showTextDocument(leftDoc);
				await leftEditor.edit(editBuilder => {
					const fullRange = new vscode.Range(0, 0, leftDoc.lineCount, 0);
					editBuilder.replace(fullRange, rightDoc.getText());
				});

				// 保存左边文档
				await leftDoc.save();
			} else {
				vscode.window.showErrorMessage('No file to apply diff result.');
			}
		})
	);
}

export {
	checkDependencyPackage,
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
};
