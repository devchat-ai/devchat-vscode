import * as vscode from 'vscode';

import { dependencyCheck } from './statusBarViewBase';
import { logger } from '@/util/logger';


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