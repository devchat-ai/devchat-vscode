import * as vscode from 'vscode';

import { dependencyCheck } from './statusBarViewBase';
import { isIndexingStopped, isNeedIndexingCode } from '../util/askCodeUtil';


export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	
    // Set the status bar item properties
    statusBarItem.text = `$(warning)DevChat`;
    statusBarItem.tooltip = 'DevChat is checking ..., please wait';
	// when statsBarItem.command is '', then there is "command '' not found" error.
    statusBarItem.command = undefined;

    // add a timer to update the status bar item
	let runStatus = 0;
	let continueTimes = 0

	setInterval(async () => {
		if (runStatus > 0 && continueTimes < 60) {
			continueTimes += 1;
			return ;
		}

		runStatus = 1;
		continueTimes = 0;

		try {
			const [devchatStatus, apiKeyStatus] = await dependencyCheck();
			if (devchatStatus !== 'ready') {
				statusBarItem.text = `$(warning)DevChat`;
				statusBarItem.tooltip = `${devchatStatus}`;

				if (devchatStatus === 'Missing required dependency: Python3') {
					statusBarItem.command = "devchat.PythonPath";
				} else {
					statusBarItem.command = undefined;
				}
				
				// set statusBarItem warning color
				return;
			}

			if (apiKeyStatus !== 'ready') {
				statusBarItem.text = `$(warning)DevChat`;
				statusBarItem.tooltip = `${apiKeyStatus}`;
				statusBarItem.command = 'DevChat.Access_Key_DevChat';
				return;
			}

			statusBarItem.text = `$(pass)DevChat`;
			statusBarItem.tooltip = `ready to chat`;
			statusBarItem.command = 'devcaht.onStatusBarClick';
		} catch (error) {
			statusBarItem.text = `$(warning)DevChat`;
			statusBarItem.tooltip = `Error: ${error}`;
			statusBarItem.command = undefined;
		} finally {
			runStatus = 0;
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