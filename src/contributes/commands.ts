import * as vscode from 'vscode';
import * as fs from 'fs';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import ExtensionContextHolder from '../util/extensionContext';
import { TopicManager } from '../topic/topicManager';
import { TopicTreeDataProvider, TopicTreeItem } from '../panel/topicView';
import { FilePairManager } from '../util/diffFilePairs';
import { ApiKeyManager } from '../util/apiKey';
import { UiUtilWrapper } from '../util/uiUtil';
import { isValidApiKey } from '../handler/historyMessagesBase';

import { logger } from '../util/logger';
import { CommandRun, createTempSubdirectory, runCommandAndWriteOutput, runCommandStringAndWriteOutput, runCommandStringArrayAndWriteOutput } from '../util/commonUtil';
import { updateIndexingStatus, updateLastModifyTime } from '../util/askCodeUtil';
import { installAskCode as installAskCodeFun } from '../util/python_installer/install_askcode';

import { ProgressBar } from '../util/progressBar';
import path from 'path';
import { MessageHandler } from '../handler/messageHandler';

let indexProcess: CommandRun | null = null;
let summaryIndexProcess: CommandRun | null = null;

function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('devchat.openChatPanel', async () => {
		await vscode.commands.executeCommand('devchat-view.focus');
	});
	context.subscriptions.push(disposable);
}

async function ensureChatPanel(context: vscode.ExtensionContext): Promise<boolean> {
	await vscode.commands.executeCommand('devchat-view.focus');
	return true;
}

function registerAddContextCommand(context: vscode.ExtensionContext) {
	const callback = async (uri: { fsPath: any; }) => {
		if (!await ensureChatPanel(context)) {
			return;
		}

		await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, uri.fsPath);
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addConext', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addConext_chinese', callback));
}

function registerAskForCodeCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			const selectedText = editor.document.getText(editor.selection);
			await sendCodeSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName, selectedText, editor.selection.start.line);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode_chinese', callback));
}

function registerAskForFileCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile_chinese', callback));
}

export function registerOpenAiApiKeySettingCommand(context: vscode.ExtensionContext) {
	const secretStorage: vscode.SecretStorage = context.secrets;
	context.subscriptions.push(
		vscode.commands.registerCommand('DevChat.Api_Key_OpenAI', async () => {
			const passwordInput: string = await vscode.window.showInputBox({
				password: true,
				title: "Input OpenAi Api Key",
				placeHolder: "Set OpenAI Api Key.(Leave blank if clearing stored key.)"
			}) ?? '';

			if (passwordInput.trim() !== "" && !isValidApiKey(passwordInput)) {
				UiUtilWrapper.showErrorMessage("Your api key is invalid!");
				return ;
			}
			ApiKeyManager.writeApiKeySecret(passwordInput, "OpenAI");
		})
	);
}

export function registerDevChatApiKeySettingCommand(context: vscode.ExtensionContext) {
	const secretStorage: vscode.SecretStorage = context.secrets;
	context.subscriptions.push(
		vscode.commands.registerCommand('DevChat.Access_Key_DevChat', async () => {
			const passwordInput: string = await vscode.window.showInputBox({
				password: true,
				title: "Input DevChat Access Key",
				placeHolder: "Set DevChat Access Key.(Leave blank if clearing stored key.)"
			}) ?? '';

			if (passwordInput.trim() !== "" && !isValidApiKey(passwordInput)) {
				UiUtilWrapper.showErrorMessage("Your access key is invalid!");
				return ;
			}
			ApiKeyManager.writeApiKeySecret(passwordInput, "DevChat");
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

const topicDeleteCallback = async (item: TopicTreeItem) => {
	const confirm = 'Delete';
	const label = typeof item.label === 'string' ? item.label : item.label!.label;
	const truncatedLabel = label.substring(0, 20) + (label.length > 20 ? '...' : '');
	const result = await vscode.window.showWarningMessage(
		`Are you sure you want to delete the topic "${truncatedLabel}"?`,
		{ modal: true },
		confirm
	);

	if (result === confirm) {
		TopicManager.getInstance().deleteTopic(item.id);
	}
};
;

export function regTopicDeleteCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.deleteTopic', topicDeleteCallback)
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
				topicDeleteCallback(selectedItem);
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
		vscode.commands.registerCommand('devchat-topicview.reloadTopic', async () => {
			TopicManager.getInstance().loadTopics();
		})
	);
}

export function regPythonPathCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.PythonPath', async () => {
			const pythonPath = await vscode.window.showInputBox({
				title: "Set Python Path",
				placeHolder: "Set Python Path"
			}) ?? '';

			if (pythonPath) {
				vscode.workspace.getConfiguration("DevChat").update("PythonPath", pythonPath, vscode.ConfigurationTarget.Global);
			}
		})
	);
}

export function regApplyDiffResultCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.applyDiffResult', async () => {
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

export function TestDevChatCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.', async () => {
			TopicManager.getInstance().loadTopics();
		})
	);
}



export function registerAskCodeIndexStartCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeIndexStart', async () => {
        const progressBar = new ProgressBar();
		progressBar.init();

		progressBar.update("Index source code files for ask codebase ...", 0);

		const config = getConfig();
        const pythonVirtualEnv = config.pythonVirtualEnv;
        const supportedFileTypes = config.supportedFileTypes;

		updateIndexingStatus("started");

        if (!pythonVirtualEnv) {
			progressBar.update("Install devchat-ask package ...", 0);
            await installAskCode(supportedFileTypes, progressBar, indexCode);
        } else {
			progressBar.update("Index source files ...", 0);
            await indexCode(pythonVirtualEnv, supportedFileTypes, progressBar);
        }

		updateIndexingStatus("stopped");
    });
    context.subscriptions.push(disposable);
}

function getConfig() {
    return {
        pythonVirtualEnv: vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv'),
        supportedFileTypes: vscode.workspace.getConfiguration('DevChat.askcode').get('supportedFileTypes'),
    };
}


async function installAskCode(supportedFileTypes, progressBar: any, callback: Function) {
    const pythonEnvPath : string = await installAskCodeFun();
    if (!pythonEnvPath) {
        logger.channel()?.error(`Installation failed!`);
        logger.channel()?.show();
        return;
    }

    UiUtilWrapper.updateConfiguration("DevChat", "PythonVirtualEnv", pythonEnvPath.trim());
    logger.channel()?.info(`Installation finished.`);
    
    // Execute the callback function after the installation is finished
    await callback(pythonEnvPath, supportedFileTypes, progressBar);
}

async function indexCode(pythonVirtualEnv, supportedFileTypes, progressBar: any) {
    let envs = {};

    let openaiApiKey = await ApiKeyManager.getApiKey();
    if (!openaiApiKey) {
        logger.channel()?.error('The OpenAI key is invalid!');
        logger.channel()?.show();

		progressBar.endWithError("The OpenAI key is invalid!");
        return;
    }
    envs['OPENAI_API_KEY'] = openaiApiKey;

    const openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
    if (openAiApiBase) {
        envs['OPENAI_API_BASE'] = openAiApiBase;
    }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    
    const command = pythonVirtualEnv.trim();
    const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_index_query.py", "index", ".", supportedFileTypes];
    const options = { env: envs, cwd: workspaceDir };

    indexProcess = new CommandRun();
    const result = await indexProcess.spawnAsync(command, args, options, (data) => {
        if (data.includes('Skip file:')) {
			return;
		}
		logger.channel()?.info(`${data}`);
    }, (data) => {
		if (data.includes('Skip file:')) {
			return;
		}
        logger.channel()?.info(`${data}`);
    }, undefined, undefined);

    if (result.exitCode !== 0) {
		if (result.exitCode === null) {
			logger.channel()?.info(`Indexing stopped!`);
			progressBar.endWithError(`Indexing stopped!`);
		} else {
			logger.channel()?.error(`Indexing failed: ${result.stderr}`);
			logger.channel()?.show();
			progressBar.endWithError(`Indexing failed: ${result.stderr}`);
		}

        return;
    }

	updateLastModifyTime();
    logger.channel()?.info(`index finished.`);

	progressBar.update("Indexing finished.");
	progressBar.end();
}


export function registerAskCodeIndexStopCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeIndexStop', async () => {
        if (indexProcess) {
			indexProcess.stop();
			indexProcess = null;
		}
    });
    context.subscriptions.push(disposable);
}

export function registerAskCodeSummaryIndexStartCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeSummaryIndexStart', async () => {
        const progressBar = new ProgressBar();
        progressBar.init();

        progressBar.update("Index source code files for ask codebase summary...", 0);

        const config = getConfig();
        const pythonVirtualEnv = config.pythonVirtualEnv;
        const supportedFileTypes = config.supportedFileTypes;

        updateIndexingStatus("started");

        if (!pythonVirtualEnv) {
            progressBar.update("Install devchat-ask package ...", 0);
            await installAskCode(supportedFileTypes, progressBar, indexCodeSummary);
        } else {
            progressBar.update("Index source files for summary...", 0);
            await indexCodeSummary(pythonVirtualEnv, supportedFileTypes, progressBar);
        }

        updateIndexingStatus("stopped");
    });
    context.subscriptions.push(disposable);
}

async function indexCodeSummary(pythonVirtualEnv, supportedFileTypes, progressBar: any) {
    let envs = {};

    let openaiApiKey = await ApiKeyManager.getApiKey();
    if (!openaiApiKey) {
        logger.channel()?.error('The OpenAI key is invalid!');
        logger.channel()?.show();

        progressBar.endWithError("The OpenAI key is invalid!");
        return;
    }
    envs['OPENAI_API_KEY'] = openaiApiKey;

    const openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
    if (openAiApiBase) {
        envs['OPENAI_API_BASE'] = openAiApiBase;
    }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    
    const command = pythonVirtualEnv.trim();
    const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_summary_index.py", "index", supportedFileTypes];
    const options = { env: envs, cwd: workspaceDir };

    summaryIndexProcess = new CommandRun();
    const result = await summaryIndexProcess.spawnAsync(command, args, options, (data) => {
        if (data.includes('Skip file:')) {
            return;
        }
        logger.channel()?.info(`${data}`);
    }, (data) => {
        if (data.includes('Skip file:')) {
            return;
        }
        logger.channel()?.info(`${data}`);
    }, undefined, undefined);

    if (result.exitCode !== 0) {
        if (result.exitCode === null) {
            logger.channel()?.info(`Indexing stopped!`);
            progressBar.endWithError(`Indexing stopped!`);
        } else {
            logger.channel()?.error(`Indexing failed: ${result.stderr}`);
            logger.channel()?.show();
            progressBar.endWithError(`Indexing failed: ${result.stderr}`);
        }

        return;
    }

    updateLastModifyTime();
    logger.channel()?.info(`index finished.`);

    progressBar.update("Indexing finished.");
    progressBar.end();
}

export function registerAskCodeSummaryIndexStopCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeIndexSummaryStop', async () => {
        // 在这里实现停止索引的功能
        // 你可能需要检查summaryIndexProcess变量是否为null，如果不为null，那么停止索引进程
        if (summaryIndexProcess) {
            summaryIndexProcess.stop();
            summaryIndexProcess = null;
        }
    });
    context.subscriptions.push(disposable);
}

export function registerAddSummaryContextCommand(context: vscode.ExtensionContext) {
    const callback = async (uri: { fsPath: any; }) => {
        if (!await ensureChatPanel(context)) {
            return;
        }

		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		if (!workspaceDir) {
			return ;
		}
		// check whether workspaceDir/.chat/.summary.json文件存在
		if (!fs.existsSync(path.join(workspaceDir, '.chat', '.summary.json'))) {
			logger.channel()?.info(`You should index this workspace first.`);
			logger.channel()?.show();
			return;
		}

		const config = getConfig();
        const pythonVirtualEnv: any = config.pythonVirtualEnv;
        
		const tempDir = await createTempSubdirectory('devchat/context');
        const summaryFile = path.join(tempDir, 'summary.txt');

		const summaryArgs = [pythonVirtualEnv, UiUtilWrapper.extensionPath() + "/tools/askcode_summary_index.py", "desc", uri.fsPath];
		const result = await runCommandStringArrayAndWriteOutput(summaryArgs, summaryFile);
		logger.channel()?.info(`  exit code:`, result.exitCode);

		logger.channel()?.debug(`  stdout:`, result.stdout);
		logger.channel()?.debug(`  stderr:`, result.stderr);
        MessageHandler.sendMessage(ExtensionContextHolder.provider?.view()!, { command: 'appendContext', context: `[context|${summaryFile}]` });
    };
    context.subscriptions.push(vscode.commands.registerCommand('devchat.addSummaryContext', callback));
}


export {
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
};
