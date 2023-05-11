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

	checkDependencyPackage();
	registerOpenChatPanelCommand(context);
	registerAddContextCommand(context);
	registerAskForCodeCommand(context);
	registerAskForFileCommand(context);
}
exports.activate = activate;
