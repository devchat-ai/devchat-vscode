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
	vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'DevChat',
        cancellable: false
    }, (progress, token) => {
        return new Promise<void>(resolve => {
			const timer = setInterval(async () => {
				try {
					progress.report({ message: `Checking devchat dependency environment` });

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
						progress.report({ message: `Checking devchat dependency environment: ${devchatStatus}` });
						return;
					}
		
					if (apiKeyStatus !== 'has valid access key') {
						statusBarItem.text = `$(warning)DevChat`;
						statusBarItem.tooltip = `${apiKeyStatus}`;
						statusBarItem.command = 'DevChat.Access_Key_DevChat';
						progress.report({ message: `Checking devchat dependency environment: ${apiKeyStatus}.` });
						return;
					}
		
					statusBarItem.text = `$(pass)DevChat`;
					statusBarItem.tooltip = `ready to chat`;
					statusBarItem.command = 'devcaht.onStatusBarClick';
					progress.report({ message: `Checking devchat dependency environment: Success` });

					clearInterval(timer);
                    resolve();
				} catch (error) {
					statusBarItem.text = `$(warning)DevChat`;
					statusBarItem.tooltip = `Error: ${error}`;
					statusBarItem.command = undefined;
					progress.report({ message: `Checking devchat dependency environment: Fail with exception.` });
				}
			}, 3000);
        });
    });

	

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