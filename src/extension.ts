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
import { createStatusBarItem } from './panel/statusBarView';
import { UiUtilWrapper } from './util/uiUtil';
import { UiUtilVscode } from './util/uiUtil_vscode';
import { FT } from './util/feature_flags/feature_toggles';
import { ApiKeyManager } from './util/apiKey';

async function isProviderHasSetted() {
	try {
		const providerProperty = "Provider.devchat";
		const providerConfig: any = UiUtilWrapper.getConfiguration("devchat", providerProperty);
		if (Object.keys(providerConfig).length > 0) {
			return true;
		}

		const providerPropertyOpenAI = "Provider.openai";
		const providerConfigOpenAI: any = UiUtilWrapper.getConfiguration("devchat", providerPropertyOpenAI);
		if (Object.keys(providerConfigOpenAI).length > 0) {
			return true;
		}

		const apiOpenaiKey = await ApiKeyManager.getProviderApiKey("openai");
		if (apiOpenaiKey) {
			return true;
		}
		const devchatKey = await ApiKeyManager.getProviderApiKey("devchat");
		if (devchatKey) {
			return true;
		}

		return false;
	} catch (error) {
		return false;
	}
	
}

async function configUpdateTo_0924() {
	if (await isProviderHasSetted()) {
		return ;
	}
	const defaultModel: any = UiUtilWrapper.getConfiguration("devchat", "defaultModel");

	let devchatKey = UiUtilWrapper.getConfiguration('DevChat', 'Access_Key_DevChat');
	let openaiKey = UiUtilWrapper.getConfiguration('DevChat', 'Api_Key_OpenAI');
	const endpointKey = UiUtilWrapper.getConfiguration('DevChat', 'API_ENDPOINT');

	devchatKey = undefined;
	openaiKey = undefined;
	if (!devchatKey && !openaiKey) {
		openaiKey = await UiUtilWrapper.secretStorageGet("openai_OPENAI_API_KEY");
		devchatKey = await UiUtilWrapper.secretStorageGet("devchat_OPENAI_API_KEY");
		await UiUtilWrapper.storeSecret("openai_OPENAI_API_KEY", "");
		await UiUtilWrapper.storeSecret("devchat_OPENAI_API_KEY", "");
	}
	if (!devchatKey && !openaiKey) {
		openaiKey = process.env.OPENAI_API_KEY;
	}

	let modelConfigNew = {};
	let providerConfigNew = {};
	if (openaiKey) {
		providerConfigNew["access_key"] = openaiKey;
		if (endpointKey) {
			providerConfigNew["api_base"] = endpointKey;
		}

		await vscode.workspace.getConfiguration("devchat").update("Provider.openai", providerConfigNew, vscode.ConfigurationTarget.Global);
	}

	if (devchatKey) {
		providerConfigNew["access_key"] = devchatKey;
		if (endpointKey) {
			providerConfigNew["api_base"] = endpointKey;
		}

		await vscode.workspace.getConfiguration("devchat").update("Provider.devchat", providerConfigNew, vscode.ConfigurationTarget.Global);
	}

	const support_models = [
		"Model.gpt-3-5",
		"Model.gpt-3-5-16k",
		"Model.gpt-4",
		"Model.gpt-4-turbo",
		"Model.claude-2",
		"Model.xinghuo-2",
		"Model.chatglm_pro",
		"Model.ERNIE-Bot",
		"Model.CodeLlama-34b-Instruct",
		"Model.llama-2-70b-chat"
	];

	for (const model of support_models) {
		const modelConfig1: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (Object.keys(modelConfig1).length === 0) {
			modelConfigNew = {"provider": "devchat"};
			if (model.startsWith("Model.gpt-")) {
				modelConfigNew = {"provider": "openai"};
			}

			await vscode.workspace.getConfiguration("devchat").update(model, modelConfigNew, vscode.ConfigurationTarget.Global);
		}
	}

	if (!defaultModel) {
		await vscode.workspace.getConfiguration("devchat").update("defaultModel", "claude-2", vscode.ConfigurationTarget.Global);
	}
}


async function configUpdate0912To_0924() {
	if (await isProviderHasSetted()) {
		return ;
	}
	
	const old_models = [
		"Model.gpt-3-5",
		"Model.gpt-3-5-16k",
		"Model.gpt-4",
		"Model.claude-2"
	];

	for (const model of old_models) {
		const modelConfig: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (Object.keys(modelConfig).length !== 0) {
			let modelProperties: any = {};
			for (const key of Object.keys(modelConfig || {})) {
				const property = modelConfig![key];
				modelProperties[key] = property;
			}

			if (modelConfig["api_key"]) {
				let providerConfigNew = {}
				providerConfigNew["access_key"] = modelConfig["api_key"];
				if (modelConfig["api_base"]) {
					providerConfigNew["api_base"] = modelConfig["api_base"];
				}

				if (modelConfig["api_key"].startsWith("DC.")) {
					modelProperties["provider"] = "devchat";
					await vscode.workspace.getConfiguration("devchat").update("Provider.devchat", providerConfigNew, vscode.ConfigurationTarget.Global);
				} else {
					modelProperties["provider"] = "openai";
					await vscode.workspace.getConfiguration("devchat").update("Provider.openai", providerConfigNew, vscode.ConfigurationTarget.Global);
				}
				
				delete modelProperties["api_key"];
				delete modelProperties["api_base"];
				await vscode.workspace.getConfiguration("devchat").update(model, modelProperties, vscode.ConfigurationTarget.Global);
			} else {
				if (!modelProperties["provider"]) {
					delete modelProperties["api_base"];
					modelProperties["provider"] = "devchat";
					await vscode.workspace.getConfiguration("devchat").update(model, modelProperties, vscode.ConfigurationTarget.Global);
				}
			}
		}
	}
}


async function activate(context: vscode.ExtensionContext) {
    ExtensionContextHolder.context = context;

    logger.init(LoggerChannelVscode.getInstance());
    UiUtilWrapper.init(new UiUtilVscode());

	await configUpdateTo_0924();
	await configUpdate0912To_0924();

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