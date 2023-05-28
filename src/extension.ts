import * as vscode from 'vscode';
import * as fs from 'fs';

import {
	checkOpenAiAPIKey,
	checkDevChatDependency,
	checkDependencyPackage,
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
} from './contributes/commands';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';
import { DevChatViewProvider } from './panel/devchatView';
import path from 'path';
import { FilePairManager } from './util/diffFilePairs';
import { Topic, TopicManager } from './topic/topicManager';


class TopicTreeItem extends vscode.TreeItem {
	id: string;
	date: number | undefined;
	constructor(label: string, id: string, date: number | undefined, collapsibleState: vscode.TreeItemCollapsibleState) {
		super(label, collapsibleState);
		this.id = id;
		this.date = date;
		this.iconPath = new vscode.ThemeIcon('symbol-variable');
		this.contextValue = 'yourTreeItem'; // 添加这一行
	}
}

class TopicTreeDataProvider implements vscode.TreeDataProvider<TopicTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TopicTreeItem | undefined | null | void> = new vscode.EventEmitter<TopicTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TopicTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	public selectedItem: TopicTreeItem | null = null;
	private items: TopicTreeItem[] = [];

	// reg listeners to TopicManager in constructor
	constructor() {
		TopicManager.getInstance().addOnCreateTopicListener(this.addItem.bind(this));
		TopicManager.getInstance().addOnDeleteTopicListener(this.onDeleteTopic.bind(this));
		TopicManager.getInstance().addOnReloadTopicsListener(this.onReloadTopics.bind(this));
		TopicManager.getInstance().addOnUpdateTopicListener(this.onUpdateTopics.bind(this));
	}

	// sort items
	private sortItems() {
		this.items.sort((a, b) => {
			if (a.date && b.date) {
				return b.date - a.date;
			} else if (!a.date) {
				return -1;
			} else if (!b.date) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	onUpdateTopics(topicId: string) {
		const items = this.items.filter(i => i.id === topicId);
		const topic = TopicManager.getInstance().getTopic(topicId);
		items.map((item) => {
			item.label = topic?.name;
			item.date = topic?.lastUpdated;
		});
		this.sortItems();
		this._onDidChangeTreeData.fire();
	}

	onReloadTopics(topics: Topic[]) {
		const items = topics.map((topic) => {
			return new TopicTreeItem(topic.name ? topic.name : "new topic", topic.topicId, topic.lastUpdated, vscode.TreeItemCollapsibleState.None);
		});
		this.items = items;
		this.sortItems();
		this._onDidChangeTreeData.fire();
	}

	onDeleteTopic(topicId: string) {
		this.items = this.items.filter(i => i.id !== topicId);
		this.sortItems();
		this._onDidChangeTreeData.fire();
	}

	setSelectedItem(item: TopicTreeItem): void {
		this.selectedItem = item;
	}

	getChildren(element?: TopicTreeItem): vscode.ProviderResult<TopicTreeItem[]> {
		return this.items;
	}

	getTreeItem(element: TopicTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		element.command = {
			title: 'Select Item',
			command: 'devchat-topicview.selectTopic',
			arguments: [element],
		};
		return element;
	}

	reload(): void {
		const topicList = TopicManager.getInstance().getTopicList();
		this.onReloadTopics(topicList);
	}

	addItem(topic: Topic): void {
		const newItem = new TopicTreeItem(topic.name ? topic.name : "new topic", topic.topicId, topic.lastUpdated, vscode.TreeItemCollapsibleState.None);
		this.items.push(newItem);
		this.sortItems();
		this._onDidChangeTreeData.fire();
	}


	deleteItem(item: TopicTreeItem): void {
		this.items = this.items.filter(i => i !== item);
		this.sortItems();
		this._onDidChangeTreeData.fire();
	}
}

function getExtensionVersion(context: vscode.ExtensionContext): string {
	const packageJsonPath = path.join(context.extensionUri.fsPath, 'package.json');
	const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonContent);

	return packageJson.version;
}


function activate(context: vscode.ExtensionContext) {
	ExtensionContextHolder.context = context;
	const extensionVersion = getExtensionVersion(context);
	logger.init(context);

	const secretStorage: vscode.SecretStorage = context.secrets;
	vscode.commands.registerCommand('DevChat.OPENAI_API_KEY', async () => {
		const passwordInput: string = await vscode.window.showInputBox({
			password: true,
			title: "OPENAI_API_KEY"
		}) ?? '';

		secretStorage.store("devchat_OPENAI_API_KEY", passwordInput);
	});

	const currentLocale = vscode.env.language;
	if (currentLocale === 'zh-cn' || currentLocale === 'zh-tw') {
		vscode.commands.executeCommand('setContext', 'isChineseLocale', true);
	} else {
		vscode.commands.executeCommand('setContext', 'isChineseLocale', false);
	}

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
	setInterval(async () => {
		const versionOld = await secretStorage.get("devchat_version_old");
		const versionNew = extensionVersion;
		const versionChanged = versionOld !== versionNew;
		await secretStorage.store("devchat_version_old", versionNew!);

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
			if (bOk && versionChanged) {
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
			const bOk = await checkOpenAiAPIKey();
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

	vscode.commands.registerCommand('devchat-topicview.deleteTopic', (item: TopicTreeItem) => {
		TopicManager.getInstance().deleteTopic(item.id);
	});

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
			TopicManager.getInstance().deleteTopic(selectedItem.id);
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
