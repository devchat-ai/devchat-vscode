import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { checkOpenAiAPIKey, checkDevChatDependency } from '../contributes/commands';
import { logger } from '../util/logger';
import { TopicManager } from '../topic/topicManager';


function getExtensionVersion(context: vscode.ExtensionContext): string {
	const packageJsonPath = path.join(context.extensionUri.fsPath, 'package.json');
	const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonContent);

	return packageJson.version;
}

export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    // Set the status bar item properties
    statusBarItem.text = `$(warning)DevChat`;
    statusBarItem.tooltip = 'DevChat checking ..., please wait.';
    statusBarItem.command = '';

    // add a timer to update the status bar item
    let devchatStatus = '';
    let apiKeyStatus = '';

	const extensionVersion = getExtensionVersion(context);
	const secretStorage: vscode.SecretStorage = context.secrets;

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
			statusBarItem.command = '';
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
    return statusBarItem;
}