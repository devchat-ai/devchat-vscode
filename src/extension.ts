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
		secretStorage.store("devchat_version_old", versionNew!);

		// status item has three status type
		// 1. not in a folder
		// 2. dependence is invalid
		// 3. ready
		if (devchatStatus === '' || devchatStatus === 'waiting install devchat') {
			let bOk = true;
			let devChat : string|undefined = vscode.workspace.getConfiguration('DevChat').get('DevChatPath');
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
			} else {
				if (devchatStatus === '') {
					devchatStatus = 'not ready';
				}
			}
		}
		if (devchatStatus === 'not ready') {
			// auto install devchat
			const terminal = vscode.window.createTerminal("DevChat Install");
			terminal.sendText(`python ${context.extensionUri.fsPath+"/tools/install.py"}`);
			terminal.show();
			devchatStatus = 'waiting install devchat';
		}

		if (devchatStatus !== 'ready') {
			statusBarItem.text = `$(warning)DevChat`;
			statusBarItem.tooltip = `${devchatStatus}`;
			statusBarItem.command = '';
			// set statusBarItem warning color
			return ;
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
			return ;
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
		vscode.commands.registerCommand('devcaht.onStatusBarClick',async () => {
			await vscode.commands.executeCommand('devchat-view.focus');
		})
	);

	ExtensionContextHolder.provider = new DevChatViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('devchat-view', ExtensionContextHolder.provider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

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
