import * as vscode from 'vscode';

import { dependencyCheck } from './statusBarViewBase';
import { ProgressBar } from '../util/progressBar';
import { logger } from '../util/logger';
import { DevChatConfig } from '../util/config';


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
	let hasInstallCommands = false;

	const timer = setInterval(async () => {
		try {
			progressBar.update("Checking dependencies", 0);

			const devchatStatus = await dependencyCheck();
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

			statusBarItem.text = `$(pass)DevChat`;
			statusBarItem.tooltip = `ready to chat`;
			statusBarItem.command = 'devcaht.onStatusBarClick';
			progressBar.update(`Checking dependencies: Success`, 0);
			progressBar.end();
	
			// install devchat workflow commands
			if (!hasInstallCommands) {
				hasInstallCommands = true;
				await vscode.commands.executeCommand('DevChat.InstallCommands');
				// vscode.commands.executeCommand('DevChat.InstallCommandPython');
			}
			
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

