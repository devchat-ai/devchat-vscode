import * as vscode from 'vscode';


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



function activate(context: vscode.ExtensionContext) {
	ExtensionContextHolder.context = context;
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
		// status item has three status type
		// 1. not in a folder
		// 2. dependence is invalid
		// 3. ready
		if (devchatStatus === '' || devchatStatus === 'waitting install devchat') {
			const bOk = checkDevChatDependency();
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
			terminal.sendText("pip3 install devchat");
			terminal.show();
			devchatStatus = 'waitting install devchat';
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
		statusBarItem.command = 'devchat.openChatPanel';
	}, 3000);

	// Add the status bar item to the status bar
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Register the command
	context.subscriptions.push(
		vscode.commands.registerCommand('devcaht.onStatusBarClick', () => {
			vscode.window.showInformationMessage('My Status Bar Item was clicked!');
		})
	);

	ExtensionContextHolder.provider = new DevChatViewProvider(context), {
		webviewOptions: { retainContextWhenHidden: true }
	};
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('devchat-view', ExtensionContextHolder.provider)
	);
}
exports.activate = activate;
