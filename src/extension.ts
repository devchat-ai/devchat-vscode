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
	const defaultModel: any = UiUtilWrapper.getConfiguration("devchat", "defaultModel");
	

	let devchatKey = UiUtilWrapper.getConfiguration('DevChat', 'Access_Key_DevChat');
	let openaiKey = UiUtilWrapper.getConfiguration('DevChat', 'Api_Key_OpenAI');
	const endpointKey = UiUtilWrapper.getConfiguration('DevChat', 'API_ENDPOINT');

	devchatKey = undefined;
	openaiKey = undefined;
	if (!devchatKey && !openaiKey) {
		openaiKey = await UiUtilWrapper.secretStorageGet("openai_OPENAI_API_KEY");
		devchatKey = await UiUtilWrapper.secretStorageGet("devchat_OPENAI_API_KEY");
	}
	if (!devchatKey && !openaiKey) {
		openaiKey = process.env.OPENAI_API_KEY;
	}

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
			modelConfigNew["provider"] = "openai";
		}

		if (!defaultModel) {
			vscode.workspace.getConfiguration("devchat").update("defaultModel", "gpt-3.5-turbo", vscode.ConfigurationTarget.Global);
		}

		try {
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-3-5", modelConfigNew, vscode.ConfigurationTarget.Global);
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-3-5-16k", modelConfigNew, vscode.ConfigurationTarget.Global);
			vscode.workspace.getConfiguration("devchat").update("Model.gpt-4", modelConfigNew, vscode.ConfigurationTarget.Global);
		} catch(error) {
			return;
		}
	}

	const modelConfig4: any = UiUtilWrapper.getConfiguration("devchat", "Model.claude-2");
	if (Object.keys(modelConfig4).length === 0) {
		modelConfigNew = {};
		if (devchatKey) {
			modelConfigNew["api_key"] = devchatKey;
		} else if (openaiKey) {
			modelConfigNew["api_key"] = openaiKey;
		}

		if (modelConfigNew["api_key"].startsWith("DC.")) {
			if (!defaultModel) {
				vscode.workspace.getConfiguration("devchat").update("defaultModel", "claude-2", vscode.ConfigurationTarget.Global);
			}

			modelConfigNew["provider"] = "anthropic";
			vscode.workspace.getConfiguration("devchat").update("Model.claude-2", modelConfigNew, vscode.ConfigurationTarget.Global);
		}
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