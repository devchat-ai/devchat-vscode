import * as vscode from 'vscode';

import {
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
    registerOpenAiApiKeySettingCommand,
    registerDevChatApiKeySettingCommand,
    regTopicDeleteCommand,
    regAddTopicCommand,
    regDeleteSelectTopicCommand,
    regSelectTopicCommand,
    regReloadTopicCommand,
    regApplyDiffResultCommand,
    registerStatusBarItemClickCommand,
    regPythonPathCommand,
    registerAskCodeIndexStartCommand,
    registerAskCodeIndexStopCommand,
    registerAskCodeSummaryIndexStartCommand,
    registerAskCodeSummaryIndexStopCommand,
	registerAddSummaryContextCommand,
} from './contributes/commands';
import { regLanguageContext } from './contributes/context';
import { regDevChatView, regTopicView } from './contributes/views';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';
import { LoggerChannelVscode } from './util/logger_vscode';
import { createStatusBarItem, createAskCodeStatusBarItem } from './panel/statusBarView';
import { UiUtilWrapper } from './util/uiUtil';
import { UiUtilVscode } from './util/uiUtil_vscode';
import { FT } from './util/feature_flags/feature_toggles';


function activate(context: vscode.ExtensionContext) {
    ExtensionContextHolder.context = context;

    logger.init(LoggerChannelVscode.getInstance());
    UiUtilWrapper.init(new UiUtilVscode());

    regLanguageContext();

    regDevChatView(context);
    regTopicView(context);

    registerOpenAiApiKeySettingCommand(context);
    registerDevChatApiKeySettingCommand(context);
    registerOpenChatPanelCommand(context);
    registerAddContextCommand(context);
    registerAskForCodeCommand(context);
    registerAskForFileCommand(context);
    registerStatusBarItemClickCommand(context);

    createStatusBarItem(context);
	if (FT("ask-code")) {
		createAskCodeStatusBarItem(context);
	}

    regTopicDeleteCommand(context);
    regAddTopicCommand(context);
    regDeleteSelectTopicCommand(context);
    regSelectTopicCommand(context);
    regReloadTopicCommand(context);
    regApplyDiffResultCommand(context);

    regPythonPathCommand(context);

	registerAskCodeIndexStartCommand(context);
	registerAskCodeIndexStopCommand(context);
    
	registerAskCodeSummaryIndexStartCommand(context);
	registerAskCodeSummaryIndexStopCommand(context);
	registerAddSummaryContextCommand(context);
}
exports.activate = activate;