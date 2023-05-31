import * as vscode from 'vscode';

import {
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
	registerApiKeySettingCommand,
	regTopicDeleteCommand,
	regAddTopicCommand,
	regDeleteSelectTopicCommand,
	regSelectTopicCommand,
	regReloadTopicCommand,
	regApplyDiffResultCommand,
	registerStatusBarItemClickCommand,
} from './contributes/commands';
import { regLanguageContext } from './contributes/context';
import { regDevChatView, regTopicView } from './contributes/views';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';
import { LoggerChannelVscode } from './util/logger_vscode';
import { createStatusBarItem } from './panel/statusBarView';
import { UiUtilWrapper, UiUtilVscode } from './util/uiUtil';


function activate(context: vscode.ExtensionContext) {
	ExtensionContextHolder.context = context;

	logger.init(LoggerChannelVscode.getInstance());
	UiUtilWrapper.init(new UiUtilVscode());

	regLanguageContext();

	regDevChatView(context);
	regTopicView(context);

	registerApiKeySettingCommand(context);
	registerOpenChatPanelCommand(context);
	registerAddContextCommand(context);
	registerAskForCodeCommand(context);
	registerAskForFileCommand(context);
	registerStatusBarItemClickCommand(context);

	createStatusBarItem(context);

	regTopicDeleteCommand(context);
	regAddTopicCommand(context);
	regDeleteSelectTopicCommand(context);
	regSelectTopicCommand(context);
	regReloadTopicCommand(context);
	regApplyDiffResultCommand(context);
}
exports.activate = activate;
