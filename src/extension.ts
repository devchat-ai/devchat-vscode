import * as vscode from 'vscode';


import {
	checkDependencyPackage,
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
} from './contributes/commands';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';


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

	checkDependencyPackage();
	registerOpenChatPanelCommand(context);
	registerAddContextCommand(context);
	registerAskForCodeCommand(context);
	registerAskForFileCommand(context);
}
exports.activate = activate;
