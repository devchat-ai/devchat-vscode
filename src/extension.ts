import * as vscode from "vscode";

import {
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
    regApplyDiffResultCommand,
    registerStatusBarItemClickCommand,
    regPythonPathCommand,
	registerInstallCommandsCommand,
	registerInstallCommandsPython,
	registerDevChatChatCommand,
	registerHandleUri,
	registerCodeLensRangeCommand,
	registerUpdateChatModelsCommand,
	registerCommentCommand,
	registerFixCommand,
	registerExplainCommand,

} from './contributes/commands';
import { regLanguageContext } from './contributes/context';
import { regDevChatView } from './contributes/views';

import { ExtensionContextHolder } from './util/extensionContext';
import { logger } from './util/logger';
import { LoggerChannelVscode } from './util/logger_vscode';
import { createStatusBarItem } from './panel/statusBarView';
import { UiUtilWrapper } from './util/uiUtil';
import { UiUtilVscode } from './util/uiUtil_vscode';
import { startRpcServer } from './ide_services/services';
import { registerCodeLensProvider } from './panel/codeLens';
import { stopDevChatBase } from './handler/sendMessageBase';
import { DevChatConfig } from './util/config';


async function migrateConfig() {
	const devchatProvider = "providers.devchat";
	const devchatProviderConfig: any = new DevChatConfig().get(devchatProvider);
	if (devchatProviderConfig) {
		return ;
	}

	const devchatVScodeProvider: any = vscode.workspace.getConfiguration("devchat").get("Provider.devchat");
	if (devchatVScodeProvider && Object.keys(devchatVScodeProvider).length > 0) {
		if (devchatVScodeProvider["access_key"]) {
			new DevChatConfig().set("providers.devchat.api_key", devchatVScodeProvider["access_key"]);
		}
		if (devchatVScodeProvider["api_base"]) {
			new DevChatConfig().set("providers.devchat.api_base", devchatVScodeProvider["api_base"]);
		}
	}
	const openaiVScodeProvider: any = vscode.workspace.getConfiguration("devchat").get("Provider.openai");
	if (openaiVScodeProvider && Object.keys(openaiVScodeProvider).length > 0) {
		if (openaiVScodeProvider["access_key"]) {
			new DevChatConfig().set("providers.openai.api_key", openaiVScodeProvider["access_key"]);
		}
		if (openaiVScodeProvider["api_base"]) {
			new DevChatConfig().set("providers.openai.api_base", openaiVScodeProvider["api_base"]);
		}
	}

	const devchatSecretKey = await UiUtilWrapper.secretStorageGet(`Access_KEY_DevChat`);
	const openaiSecretKey = await UiUtilWrapper.secretStorageGet(`Access_KEY_OpenAI`);

	if (devchatSecretKey) {
		new DevChatConfig().set("providers.devchat.api_key", devchatSecretKey);
	}
	if (openaiSecretKey) {
		new DevChatConfig().set("providers.openai.api_key", openaiSecretKey);
	}

	const enableFunctionCalling = vscode.workspace.getConfiguration("DevChat").get("EnableFunctionCalling");
	if (enableFunctionCalling) {
		new DevChatConfig().set("enable_function_calling", enableFunctionCalling);
	} else {
		new DevChatConfig().set("enable_function_calling", false);
	}

	const betaInvitationCode = vscode.workspace.getConfiguration("DevChat").get("betaInvitationCode");
	if (betaInvitationCode) {
		new DevChatConfig().set("beta_invitation_code", betaInvitationCode);
	} else {
		new DevChatConfig().set("beta_invitation_code", "");
	}

	const maxLogCount = vscode.workspace.getConfiguration("DevChat").get("maxLogCount");
	if (maxLogCount) {
		new DevChatConfig().set("max_log_count", maxLogCount);
	} else {
		new DevChatConfig().set("max_log_count", 20);
	}

	const pythonForChat = vscode.workspace.getConfiguration("DevChat").get("PythonForChat");
	if (pythonForChat) {
		new DevChatConfig().set("python_for_chat", pythonForChat);
	} else {
		new DevChatConfig().set("python_for_chat", "");
	}

	const pythonForCommands = vscode.workspace.getConfiguration("DevChat").get("PythonForCommands");
	if (pythonForCommands) {
		new DevChatConfig().set("python_for_commands", pythonForCommands);
	} else {
		new DevChatConfig().set("python_for_commands", "");
	}

	const language = vscode.workspace.getConfiguration("DevChat").get("Language");
	if (language) {
		new DevChatConfig().set("language", language);
	} else {
		new DevChatConfig().set("language", "en");
	}

	const defaultModel = vscode.workspace.getConfiguration("devchat").get("defaultModel");
	if (defaultModel) {
		new DevChatConfig().set("default_model", defaultModel);
	} else {
		new DevChatConfig().set("default_model", "");
	}
}

async function activate(context: vscode.ExtensionContext) {
  ExtensionContextHolder.context = context;

    logger.init(LoggerChannelVscode.getInstance());
	UiUtilWrapper.init(new UiUtilVscode());
	
	await migrateConfig();

    regLanguageContext();
    regDevChatView(context);

  registerOpenChatPanelCommand(context);
  registerAddContextCommand(context);
  registerAskForCodeCommand(context);
  registerAskForFileCommand(context);
  registerExplainCommand(context);
  registerFixCommand(context);
  registerCommentCommand(context);
  registerStatusBarItemClickCommand(context);

  registerInstallCommandsCommand(context);
  registerUpdateChatModelsCommand(context);
  registerInstallCommandsPython(context);

  createStatusBarItem(context);

  regApplyDiffResultCommand(context);

  regPythonPathCommand(context);
  registerDevChatChatCommand(context);
  registerCodeLensRangeCommand(context);
  registerCodeLensProvider(context);

  startRpcServer();
  logger.channel()?.info(`registerHandleUri:`);
  registerHandleUri(context);
}

async function deactivate() {
  // stop devchat
  await stopDevChatBase({});
}
exports.activate = activate;
exports.deactivate = deactivate;
