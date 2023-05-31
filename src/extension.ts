import * as vscode from 'vscode';

import {
	checkOpenaiApiKey,
	checkDevChatDependency,
	checkDependencyPackage,
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
	registerApiKeySettingCommand,
	registerStatusBarItemClickCommand,
	regTopicDeleteCommand,
	regAddTopicCommand,
	regDeleteSelectTopicCommand,
	regSelectTopicCommand,
	regReloadTopicCommand,
	regApplyDiffResultCommand,
} from './contributes/commands';
import { regLanguageContext } from './contributes/context';
import { regDevChatView, regTopicView } from './contributes/views';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';
import { createStatusBarItem } from './panel/statusBarView';


function activate(context: vscode.ExtensionContext) {
	ExtensionContextHolder.context = context;
	logger.init(context);

	regLanguageContext();

	regDevChatView(context);
	regTopicView(context);

	registerApiKeySettingCommand(context);
	registerOpenChatPanelCommand(context);
	registerAddContextCommand(context);
	registerAskForCodeCommand(context);
	registerAskForFileCommand(context);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	// Set the status bar item properties
	// const iconPath = context.asAbsolutePath(path.join('assets', 'tank.png'));

	// Set the status bar item properties
	statusBarItem.text = `$(warning)DevChat`;
	statusBarItem.tooltip = 'DevChat checking ..., please wait.';
	statusBarItem.command = '';

	// add a timer to update the status bar item
	let devchatStatus = '';
	let apiKeyStatus = '';
	let isVersionChangeCompare: boolean|undefined = undefined;
	setInterval(async () => {
		const versionOld = await secretStorage.get("DevChatVersionOld");
		const versionNew = extensionVersion;
		const versionChanged = versionOld !== versionNew;
		await secretStorage.store("DevChatVersionOld", versionNew!);
		
		// status item has three status type
		// 1. not in a folder
		// 2. dependence is invalid
		// 3. ready
		if (devchatStatus === '' || devchatStatus === 'waiting install devchat') {
			let bOk = true;
			let devChat: string | undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
			if (!devChat) {
				bOk = false;
			}

			if (!bOk) {
				bOk = checkDevChatDependency();
			}
			if (bOk && versionChanged && !isVersionChangeCompare) {
				logger.channel()?.info(`versionOld: ${versionOld}, versionNew: ${versionNew}, versionChanged: ${versionChanged}`);
				bOk = false;
			}

			if (bOk) {
				devchatStatus = 'ready';
				TopicManager.getInstance().loadTopics();
			} else {
				if (devchatStatus === '') {
					devchatStatus = 'not ready';
				}
			}
		}
		if (devchatStatus === 'not ready') {
			// auto install devchat
			const terminal = vscode.window.createTerminal("DevChat Install");
			terminal.sendText(`python ${context.extensionUri.fsPath + "/tools/install.py"}`);
			terminal.show();
			devchatStatus = 'waiting install devchat';
			isVersionChangeCompare = true;
		}

		if (devchatStatus !== 'ready') {
			statusBarItem.text = `$(warning)DevChat`;
			statusBarItem.tooltip = `${devchatStatus}`;
			statusBarItem.command = undefined;
			// set statusBarItem warning color
			return;
		}

		// check api key
		if (apiKeyStatus === '' || apiKeyStatus === 'please set api key') {
			const bOk = await checkOpenaiApiKey();
			if (bOk) {
				apiKeyStatus = 'ready';
			} else {
				apiKeyStatus = 'please set api key';
			}
		}
		if (apiKeyStatus !== 'ready') {
			statusBarItem.text = `$(warning)DevChat`;
			statusBarItem.tooltip = `${apiKeyStatus}`;
			statusBarItem.command = 'DevChat.OPENAI_API_KEY';
			return;
		}

		statusBarItem.text = `$(pass)DevChat`;
		statusBarItem.tooltip = `ready to chat`;
		statusBarItem.command = 'devcaht.onStatusBarClick';
	}, 3000);

	// Add the status bar item to the status bar
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Register the command
	context.subscriptions.push(
		vscode.commands.registerCommand('devcaht.onStatusBarClick', async () => {
			await vscode.commands.executeCommand('devchat-view.focus');
		})
	);

	ExtensionContextHolder.provider = new DevChatViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('devchat-view', ExtensionContextHolder.provider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	const yourTreeDataProvider = new TopicTreeDataProvider();
	const yourTreeView = vscode.window.createTreeView('devchat-topicview', {
		treeDataProvider: yourTreeDataProvider,
	});
	context.subscriptions.push(yourTreeView);

	const topicDeleteCallback = async (item: TopicTreeItem) => {
		const confirm = 'Delete';
		const cancel = 'Cancel';
		const label = typeof item.label === 'string' ? item.label : item.label!.label;
		const truncatedLabel = label.substring(0, 20) + (label.length > 20 ? '...' : '');
		const result = await vscode.window.showWarningMessage(
			`Are you sure you want to delete the topic "${truncatedLabel}"?`,
			{ modal: true },
			confirm,
			cancel
		);

		if (result === confirm) {
			TopicManager.getInstance().deleteTopic(item.id);
		}
	};
	vscode.commands.registerCommand('devchat-topicview.deleteTopic', topicDeleteCallback);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ pattern: '**', scheme: 'file' },
			{
				provideCodeActions: (document, range, context, token) => {
					const deleteAction = new vscode.CodeAction('Delete Item', vscode.CodeActionKind.QuickFix);
					deleteAction.command = {
						title: 'Delete Item',
						command: 'devchat-topicview.deleteTopic',
						arguments: [context.diagnostics[0].code],
					};
					return [deleteAction];
				},
			},
			{ providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
		)
	);

	vscode.commands.registerCommand('devchat-topicview.addTopic', () => {
		const topic = TopicManager.getInstance().createTopic();
		TopicManager.getInstance().setCurrentTopic(topic.topicId);
	});

	vscode.commands.registerCommand('devchat-topicview.deleteSelectedTopic', () => {
		const selectedItem = yourTreeDataProvider.selectedItem;
		if (selectedItem) {
			topicDeleteCallback(selectedItem);
		} else {
			vscode.window.showErrorMessage('No item selected');
		}
	});

	vscode.commands.registerCommand('devchat-topicview.selectTopic', (item: TopicTreeItem) => {
		yourTreeDataProvider.setSelectedItem(item);
		TopicManager.getInstance().setCurrentTopic(item.id);
	});

	vscode.commands.registerCommand('devchat-topicview.reloadTopic', async (item: TopicTreeItem) => {
		TopicManager.getInstance().loadTopics();
	});

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
exports.activate = activate;
