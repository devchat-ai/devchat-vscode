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
	registerDevChatChatCommand,
	registerHandleUri,
	registerCodeLensRangeCommand,
	registerCommentCommand,
	registerFixCommand,
	registerExplainCommand,
	registerQuickFixCommand,
	registerStartLocalServiceCommand
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
import { InlineCompletionProvider, registerCodeCompleteCallbackCommand } from "./contributes/codecomplete/codecomplete";
import { indexDir } from "./contributes/codecomplete/astIndex";
import registerQuickFixProvider from "./contributes/quickFixProvider";
import { stopLocalService } from './util/localService';
import { updateNames } from "./util/constants";


async function migrateConfig() {
	const devchatConfig = DevChatConfig.getInstance();
	const devchatProvider = "providers.devchat";
	const devchatProviderConfig: any = devchatConfig.get(devchatProvider);
	if (devchatProviderConfig) {
		return ;
	}

	const devchatVScodeProvider: any = vscode.workspace.getConfiguration("devchat").get("Provider.devchat");
	if (devchatVScodeProvider && Object.keys(devchatVScodeProvider).length > 0) {
		if (devchatVScodeProvider["access_key"]) {
			devchatConfig.set("providers.devchat.api_key", devchatVScodeProvider["access_key"]);
		}
		if (devchatVScodeProvider["api_base"]) {
			devchatConfig.set("providers.devchat.api_base", devchatVScodeProvider["api_base"]);
		}
	}
	const openaiVScodeProvider: any = vscode.workspace.getConfiguration("devchat").get("Provider.openai");
	if (openaiVScodeProvider && Object.keys(openaiVScodeProvider).length > 0) {
		if (openaiVScodeProvider["access_key"]) {
			devchatConfig.set("providers.openai.api_key", openaiVScodeProvider["access_key"]);
		}
		if (openaiVScodeProvider["api_base"]) {
			devchatConfig.set("providers.openai.api_base", openaiVScodeProvider["api_base"]);
		}
	}

	const devchatSecretKey = await UiUtilWrapper.secretStorageGet(`Access_KEY_DevChat`);
	const openaiSecretKey = await UiUtilWrapper.secretStorageGet(`Access_KEY_OpenAI`);

	if (devchatSecretKey) {
		devchatConfig.set("providers.devchat.api_key", devchatSecretKey);
	}
	if (openaiSecretKey) {
		devchatConfig.set("providers.openai.api_key", openaiSecretKey);
	}

	const enableFunctionCalling = vscode.workspace.getConfiguration("DevChat").get("EnableFunctionCalling");
	if (enableFunctionCalling) {
		devchatConfig.set("enable_function_calling", enableFunctionCalling);
	} else {
		devchatConfig.set("enable_function_calling", false);
	}

	const betaInvitationCode = vscode.workspace.getConfiguration("DevChat").get("betaInvitationCode");
	if (betaInvitationCode) {
		devchatConfig.set("beta_invitation_code", betaInvitationCode);
	} else {
		devchatConfig.set("beta_invitation_code", "");
	}

	const maxLogCount = vscode.workspace.getConfiguration("DevChat").get("maxLogCount");
	if (maxLogCount) {
		devchatConfig.set("max_log_count", maxLogCount);
	} else {
		devchatConfig.set("max_log_count", 20);
	}

	const pythonForChat = vscode.workspace.getConfiguration("DevChat").get("PythonForChat");
	if (pythonForChat) {
		devchatConfig.set("python_for_chat", pythonForChat);
	} else {
		devchatConfig.set("python_for_chat", "");
	}

	const pythonForCommands = vscode.workspace.getConfiguration("DevChat").get("PythonForCommands");
	if (pythonForCommands) {
		devchatConfig.set("python_for_commands", pythonForCommands);
	} else {
		devchatConfig.set("python_for_commands", "");
	}

	const language = vscode.workspace.getConfiguration("DevChat").get("Language");
	if (language) {
		devchatConfig.set("language", language);
	} else {
		devchatConfig.set("language", "en");
	}
}

// fix devchat api base is "custom"
export async function fixDevChatApiBase() {
	const devchatConfig = DevChatConfig.getInstance();
	const devchatProvider = "providers.devchat";
	const devchatProviderConfig: any = devchatConfig.get(devchatProvider);
	if (!devchatProviderConfig || devchatProviderConfig["api_base"] === "custom") {
		devchatConfig.set("providers.devchat.api_base", "https://api.devchat.ai/v1");
	}
}

async function activate(context: vscode.ExtensionContext) {
  ExtensionContextHolder.context = context;
  const assistantNames = context.extension.packageJSON.assistantNames
  updateNames(assistantNames.ASSISTANT_NAME_EN, assistantNames.ASSISTANT_NAME_ZH)

    logger.init(LoggerChannelVscode.getInstance());
	UiUtilWrapper.init(new UiUtilVscode());
	
	await migrateConfig();

    regLanguageContext();
    regDevChatView(context);
	
  const provider = new InlineCompletionProvider();  
  const selector = { pattern: "**" }; 
  context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider(selector, provider));  
  registerCodeCompleteCallbackCommand(context);

  function handleCodeComplete() {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
	  const position = editor.selection.active;
	  provider.triggerCodeComplete(editor.document, position);
	}
  }
  
  // command for code completion
  context.subscriptions.push(
	// 注册英文命令
	vscode.commands.registerCommand('devchat.triggerCodeComplete', handleCodeComplete),
	// 注册中文命令
	vscode.commands.registerCommand('devchat.triggerCodeCompleteChinese', handleCodeComplete)
  );

  registerOpenChatPanelCommand(context);
  registerAddContextCommand(context);
  registerAskForCodeCommand(context);
  registerAskForFileCommand(context);
  registerExplainCommand(context);
  registerFixCommand(context);
  registerCommentCommand(context);
  registerStatusBarItemClickCommand(context);

  registerInstallCommandsCommand(context);
  registerStartLocalServiceCommand(context);

  createStatusBarItem(context);

  regApplyDiffResultCommand(context);

  regPythonPathCommand(context);
  registerDevChatChatCommand(context);
  registerCodeLensRangeCommand(context);
  registerCodeLensProvider(context);
  registerQuickFixCommand(context);

  startRpcServer();
  registerHandleUri(context);
  registerQuickFixProvider();

  fixDevChatApiBase();

  const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
  if (workspaceDir) {
	indexDir(workspaceDir);
  }
}

async function deactivate() {
  // stop devchat
  await stopDevChatBase({});

  try {
    await stopLocalService();
    logger.channel()?.info('Local service stopped successfully');
  } catch (error) {
    logger.channel()?.error('Error stopping local service:', error);
  }
}
exports.activate = activate;
exports.deactivate = deactivate;
