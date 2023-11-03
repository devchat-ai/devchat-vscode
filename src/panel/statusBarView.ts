import * as vscode from 'vscode';

import { dependencyCheck } from './statusBarViewBase';
import { isIndexingStopped, isNeedIndexingCode } from '../util/askCodeUtil';
import { ProgressBar } from '../util/progressBar';
import ExtensionContextHolder from '../util/extensionContext';


export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	
    // Set the status bar item properties
    statusBarItem.text = `$(warning)DevChat`;
    statusBarItem.tooltip = 'DevChat is checking ..., please wait';
	// when statsBarItem.command is '', then there is "command '' not found" error.
    statusBarItem.command = undefined;

	const progressBar = new ProgressBar();
    progressBar.init();

    // add a timer to update the status bar item
	progressBar.update("Checking dependencies", 0);
	const timer = setInterval(async () => {
		try {
			progressBar.update("Checking dependencies", 0);

			const [devchatStatus, apiKeyStatus] = await dependencyCheck();
			if (devchatStatus !== 'has statisfied the dependency' && devchatStatus !== 'DevChat has been installed') {
				statusBarItem.text = `$(warning)DevChat`;
				statusBarItem.tooltip = `${devchatStatus}`;

				if (devchatStatus === 'Missing required dependency: Python3') {
					statusBarItem.command = "devchat.PythonPath";
				} else {
					statusBarItem.command = undefined;
				}
				
				// set statusBarItem warning color
				progressBar.update(`Checking dependencies: ${devchatStatus}`, 0);
				return;
			}

			if (apiKeyStatus !== 'has valid access key') {
				statusBarItem.text = `$(warning)DevChat`;
				statusBarItem.tooltip = `${apiKeyStatus}`;
				statusBarItem.command = 'DevChat.AccessKey.DevChat';
				progressBar.update(`Checking dependencies: ${apiKeyStatus}.`, 0);
				return;
			}

			statusBarItem.text = `$(pass)DevChat`;
			statusBarItem.tooltip = `ready to chat`;
			statusBarItem.command = 'devcaht.onStatusBarClick';
			progressBar.update(`Checking dependencies: Success`, 0);
			progressBar.end();
	
			// execute command: DevChat.InstallCommands
			vscode.commands.executeCommand('DevChat.InstallCommands');
			ExtensionContextHolder.provider?.reloadWebview();
			clearInterval(timer);
		} catch (error) {
			statusBarItem.text = `$(warning)DevChat`;
			statusBarItem.tooltip = `Error: ${error}`;
			statusBarItem.command = undefined;
			progressBar.endWithError(`Checking dependencies: Fail with exception.`);
		}
	}, 3000);

	// Add the status bar item to the status bar
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
    return statusBarItem;
}

