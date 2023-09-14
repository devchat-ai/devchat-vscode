import * as vscode from 'vscode';

import {
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
    registerAccessKeySettingCommand,
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
	registerInstallCommandsCommand,
	registerUpdateChatModelsCommand,
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

async function configUpdateTo_0912() {
	const devchatKey = UiUtilWrapper.getConfiguration('DevChat', 'Access_Key_DevChat');
	const openaiKey = UiUtilWrapper.getConfiguration('DevChat', 'Api_Key_OpenAI');
	const endpointKey = UiUtilWrapper.getConfiguration('DevChat', 'API_ENDPOINT');
	
	let modelConfigNew = {};
	if (openaiKey) {
		modelConfigNew["api_key"] = openaiKey;
		modelConfigNew["provider"] = "openai";
	} else if (devchatKey) {
		modelConfigNew["api_key"] = devchatKey;
		modelConfigNew["provider"] = "openai";
	}

	if (endpointKey) {
		modelConfigNew["api_base"] = endpointKey;
	}

	const modelConfig1: any = UiUtilWrapper.getConfiguration("devchat", "Model.gpt-3-5");
	const modelConfig2: any = UiUtilWrapper.getConfiguration("devchat", "Model.gpt-3-5-16k");
	const modelConfig3: any = UiUtilWrapper.getConfiguration("devchat", "Model.gpt-4");
	//if (!modelConfig1 && !modelConfig2 && !modelConfig3 && Object.keys(modelConfigNew).length > 0) {
	if (Object.keys(modelConfig1).length === 0 &&
		Object.keys(modelConfig2).length === 0 && 
		Object.keys(modelConfig3).length === 0) {
		// config default gpt models
		if (Object.keys(modelConfigNew).length === 0) {
			modelConfigNew["api_key"] = "DC.<your devchat key>";
			modelConfigNew["provider"] = "openai";
		}

		try {
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-3-5", modelConfigNew, vscode.ConfigurationTarget.Global);
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-3-5-16k", modelConfigNew, vscode.ConfigurationTarget.Global);
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-4", modelConfigNew, vscode.ConfigurationTarget.Global);
		} catch(error) {
			return;
		}
	}

	const defaultModel: any = UiUtilWrapper.getConfiguration("devchat", "defaultModel");
	if (!defaultModel) {
		vscode.workspace.getConfiguration("devchat").update("defaultModel", "gpt-3.5-turbo");
	}
}


function activate(context: vscode.ExtensionContext) {
    ExtensionContextHolder.context = context;

    logger.init(LoggerChannelVscode.getInstance());
    UiUtilWrapper.init(new UiUtilVscode());

	configUpdateTo_0912();

    regLanguageContext();

    regDevChatView(context);
    regTopicView(context);

    registerAccessKeySettingCommand(context);
    registerOpenChatPanelCommand(context);
    registerAddContextCommand(context);
    registerAskForCodeCommand(context);
    registerAskForFileCommand(context);
    registerStatusBarItemClickCommand(context);

	registerInstallCommandsCommand(context);
	registerUpdateChatModelsCommand(context);

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