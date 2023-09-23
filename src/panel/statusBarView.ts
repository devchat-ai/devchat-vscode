import * as vscode from 'vscode';

import { dependencyCheck } from './statusBarViewBase';
import { isIndexingStopped, isNeedIndexingCode } from '../util/askCodeUtil';
import { ProgressBar } from '../util/progressBar';


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

export function createAskCodeStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
	const askCodeBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	askCodeBarItem.text = `AskCode`;
	askCodeBarItem.tooltip = `Wait for check status for /ask-code`;
	askCodeBarItem.command = undefined;

	setInterval(async () => {
		if (isIndexingStopped()) {
			if (isNeedIndexingCode()) {
				askCodeBarItem.tooltip = `Click to index code for /ask-code`;
				askCodeBarItem.command = 'DevChat.AskCodeIndexStart';
			} else {
				askCodeBarItem.tooltip = `No need to index code for /ask-code`;
				askCodeBarItem.command = undefined;
			}
			
		} else {
			askCodeBarItem.tooltip = `Click to stop indexing code for /ask-code`;
			askCodeBarItem.command = 'DevChat.AskCodeIndexStop';
		}
	}, 10000);

	askCodeBarItem.show();
	context.subscriptions.push(askCodeBarItem);

	return askCodeBarItem;
}
