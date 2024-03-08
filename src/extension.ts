import * as vscode from 'vscode';

import {
    registerOpenChatPanelCommand,
    registerAddContextCommand,
    registerAskForCodeCommand,
    registerAskForFileCommand,
    registerAccessKeySettingCommand,
    regApplyDiffResultCommand,
    registerStatusBarItemClickCommand,
    regPythonPathCommand,
	registerInstallCommandsCommand,
	registerUpdateChatModelsCommand,
	registerInstallCommandsPython,
	registerDevChatChatCommand,
	registerHandleUri,
} from './contributes/commands';
import { regLanguageContext } from './contributes/context';
import { regDevChatView } from './contributes/views';

import { ExtensionContextHolder } from './util/extensionContext';
import { logger } from './util/logger';
import { LoggerChannelVscode } from './util/logger_vscode';
import { createStatusBarItem } from './panel/statusBarView';
import { UiUtilWrapper } from './util/uiUtil';
import { UiUtilVscode } from './util/uiUtil_vscode';
import { ApiKeyManager } from './util/apiKey';
import { startRpcServer } from './ide_services/services';
import { registerCodeLensProvider } from './panel/codeLens';
import { stopDevChatBase } from './handler/sendMessageBase';
import exp from 'constants';

/**
 * ABC isProviderHasSetted
 * @returns 
 */
async function isProviderHasSetted() {
	try {
		const providerProperty = "Provider.devchat";
		const providerConfig: any = UiUtilWrapper.getConfiguration("devchat", providerProperty);
		if (providerConfig && Object.keys(providerConfig).length > 0) {
			return true;
		}

		const providerPropertyOpenAI = "Provider.openai";
		const providerConfigOpenAI: any = UiUtilWrapper.getConfiguration("devchat", providerPropertyOpenAI);
		if (providerConfigOpenAI && Object.keys(providerConfigOpenAI).length > 0) {
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

async function  configUpdateTo1115() {
	const supportModels = [
		"Model.gpt-3-5-1106",
		"Model.gpt-4-turbo",
	];

	for (const model of supportModels) {
		const modelConfig1: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (modelConfig1 && Object.keys(modelConfig1).length === 0) {
			let modelConfigNew = {};
			modelConfigNew = {"provider": "devchat"};
			if (model.startsWith("Model.gpt-")) {
				modelConfigNew = {"provider": "openai"};
			}

			try {
				await vscode.workspace.getConfiguration("devchat").update(model, modelConfigNew, vscode.ConfigurationTarget.Global);
			} catch (error) {
				logger.channel()?.error(`update Model.ERNIE-Bot error: ${error}`);
			}
		}
	}
}

async function configUpdateTo0924() {
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
	
	const supportModels = [
		"Model.gpt-3-5",
		"Model.gpt-3-5-1106",
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
	
	for (const model of supportModels) {
		const modelConfig1: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (modelConfig1 && Object.keys(modelConfig1).length === 0) {
			modelConfigNew = {"provider": "devchat"};
			if (model.startsWith("Model.gpt-")) {
				modelConfigNew = {"provider": "openai"};
			}
			
			await vscode.workspace.getConfiguration("devchat").update(model, modelConfigNew, vscode.ConfigurationTarget.Global);
		}
	}
	
	if (!defaultModel) {
		await vscode.workspace.getConfiguration("devchat").update("defaultModel", "claude-2.1", vscode.ConfigurationTarget.Global);
	}
}


async function configUpdate0912To0924() {
	if (await isProviderHasSetted()) {
		return ;
	}
	
	const oldModels = [
		"Model.gpt-3-5",
		"Model.gpt-3-5-16k",
		"Model.gpt-4",
		"Model.claude-2"
	];

	for (const model of oldModels) {
		const modelConfig: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (modelConfig && Object.keys(modelConfig).length !== 0) {
			let modelProperties: any = {};
			for (const key of Object.keys(modelConfig || {})) {
				const property = modelConfig![key];
				modelProperties[key] = property;
			}

			if (modelConfig["api_key"]) {
				let providerConfigNew = {};
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
				try {
					await vscode.workspace.getConfiguration("devchat").update(model, modelProperties, vscode.ConfigurationTarget.Global);
				} catch (error) {
					logger.channel()?.error(`error: ${error}`);
				}
			} else {
				if (!modelProperties["provider"]) {
					delete modelProperties["api_base"];
					modelProperties["provider"] = "devchat";
					try {
						await vscode.workspace.getConfiguration("devchat").update(model, modelProperties, vscode.ConfigurationTarget.Global);
					} catch (error) {
						logger.channel()?.error(`error: ${error}`);
					}
				}
			}
		}
	}
}


async function configUpdateto240205() {
	// rename Model.CodeLlama-34b-Instruct to Model.CodeLlama-70b
	// add new Model.Mixtral-8x7B
	// add new Model.Minimax-abab6
    const supportModels = [
		"Model.CodeLlama-70b",
		"Model.Mixtral-8x7B",
		"Model.Minimax-abab6"
	];

	for (const model of supportModels) {
		const modelConfig1: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (modelConfig1 && Object.keys(modelConfig1).length === 0) {
			let modelConfigNew = {};
			modelConfigNew = {"provider": "devchat"};
			try {
				await vscode.workspace.getConfiguration("devchat").update(model, modelConfigNew, vscode.ConfigurationTarget.Global);
			} catch (error) {
				logger.channel()?.error(`error: ${error}`);
			}
		}
	}
}


async function setLangDefaultValue() {
	const lang = vscode.env.language;
	if (!UiUtilWrapper.getConfiguration("DevChat", "Language")) {
		if (lang.startsWith("zh-")) {
			UiUtilWrapper.updateConfiguration("DevChat", "Language", "zh");
		} else {
			UiUtilWrapper.updateConfiguration("DevChat", "Language", "en");
		}
	}
}

async function updateInvalidSettings() {
	const oldModels = [
		"Model.gpt-3-5",
		"Model.gpt-3-5-16k",
		"Model.gpt-4",
		"Model.claude-2"
	];

	for (const model of oldModels) {
		const modelConfig: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (modelConfig && Object.keys(modelConfig).length !== 0) {
			let modelProperties: any = {};
			for (const key of Object.keys(modelConfig || {})) {
				const property = modelConfig![key];
				modelProperties[key] = property;
			}

			if (modelConfig["api_key"]) {
				delete modelProperties["api_key"];
				delete modelProperties["api_base"];
				modelProperties["provider"] = "devchat";
				try {
					await vscode.workspace.getConfiguration("devchat").update(model, modelProperties, vscode.ConfigurationTarget.Global);
				} catch (error) {
					logger.channel()?.error(`error: ${error}`);
				}
			}
		}
	}
}

async function updateInvalidDefaultModel() {
	const defaultModel: any = UiUtilWrapper.getConfiguration("devchat", "defaultModel");
	if (defaultModel === "gpt-3.5-turbo-1106" || defaultModel === "gpt-3.5-turbo-16k") {
		try {
			await vscode.workspace.getConfiguration("devchat").update("defaultModel", "gpt-3.5-turbo", vscode.ConfigurationTarget.Global);
		} catch (error) {
			logger.channel()?.error(`update Model.ERNIE-Bot error: ${error}`);
		}
	}
}

// "gpt-3.5-turbo-1106",
// "gpt-3.5-turbo-16k",

async function configSetModelDefaultParams() {
	const modelParams = {
		"Model.gpt-3-5": {
			"max_input_tokens": 13000
		},
		"Model.gpt-4": {
			"max_input_tokens": 6000
		},
		"Model.gpt-4-turbo": {
			"max_input_tokens": 32000
		},
		"Model.claude-2": {
			"max_input_tokens": 32000
		},
		"Model.xinghuo-2": {
			"max_input_tokens": 6000
		},
		"Model.chatglm_pro": {
			"max_input_tokens": 8000
		},
		"Model.ERNIE-Bot": {
			"max_input_tokens": 8000
		},
		"Model.CodeLlama-70b": {
			"max_input_tokens": 4000
		},
		"Model.Mixtral-8x7B": {
			"max_input_tokens": 4000
		},
		"Model.Minimax-abab6": {
			"max_input_tokens": 4000
		},
		"Model.llama-2-70b-chat": {
			"max_input_tokens": 4000
		}
	};

	// set default params
	for (const model of Object.keys(modelParams)) {
		const modelConfig: any = UiUtilWrapper.getConfiguration("devchat", model);
		if (!modelConfig["max_input_tokens"]) {
			modelConfig["max_input_tokens"] = modelParams[model]["max_input_tokens"];
			try {
				await vscode.workspace.getConfiguration("devchat").update(model, modelConfig, vscode.ConfigurationTarget.Global);
			} catch (error) {
				logger.channel()?.error(`update Model.ERNIE-Bot error: ${error}`);
			}
		}
	}
}


async function code_completion(prompt: string): Promise<string[] | null> {
	const url = 'https://api.together.xyz/v1/completions';
	const headers = {
	  'Content-Type': 'application/json',
	  Authorization: 'Bearer f8c6ce19a50b5febe2a3e4f989e2b4be5bc04642117f452bfa8bf5afd936a285'
	};
	const payload = {
		model: "codellama/CodeLlama-70b-hf",
	  	prompt: prompt,
	  	stream_tokens: false,
		temperature: 0.7,
		top_p: 0.7,
		tokp_k: 50,
		repetition_penalty: 1,
		stop: ["</s>"]
	};

	try {
		logger.channel()?.info(`call url: ${url}`)
		const response = await fetch(url, {
		  method: 'POST',
		  headers,
		  body: JSON.stringify(payload),
		});
		logger.channel()?.info(`return url`);
	
		if (response.ok) {
		  const data = await response.json(); // 使用await解析JSON响应
		  return [data.response];
		} else {
		  // 如果响应不是200 OK，处理错误情况
		  console.error('Error response:', response.statusText);
		  return null;
		}
	  } catch (error) {
		// 处理请求过程中可能出现的错误
		console.error('Request failed:', error);
		return null;
	}
}

async function code_completion_local(prompt: string): Promise<string[] | null> {
	const url = 'http://192.168.1.138:11434/api/generate';
	const headers = {
	  'Content-Type': 'application/json',
	};
	const payload = {
	  model: 'starcoder:15b',
	  prompt: prompt,
	  stream: false,
	  options: {
		temperature: 0.2
	  }
	};
  
	try {
	  const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	  });
  
	  if (response.ok) {
		const data = await response.json(); // 使用await解析JSON响应
		return [data.response];
	  } else {
		// 如果响应不是200 OK，处理错误情况
		console.error('Error response:', response.statusText);
		return null;
	  }
	} catch (error) {
	  // 处理请求过程中可能出现的错误
	  console.error('Request failed:', error);
	  return null;
	}
}

// global flag var
let gShowCompletion: boolean = false;

function registerCompletionCommand(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('DevChat.completion', async () => {
		// fire code completion
		gShowCompletion = true;
		vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
	});
	context.subscriptions.push(disposable);
}

let editedFiles: any = [];
  
class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {  
    async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | null> {  
        logger.channel()?.info("start provideInlineCompletionItems");

        // 等待时间（单位：毫秒），可根据需要调整
        const delayTime = 2000;

        // // 创建一个新的Promise，用于实现等待逻辑
        // await new Promise((resolve) => {
        //     const timer = setTimeout(resolve, delayTime);
            
        //     // 如果请求在等待时间结束前被取消，则清除定时器
        //     token.onCancellationRequested(() => clearTimeout(timer));
        // });
		if (!gShowCompletion) {
			logger.channel()?.info("not trigger by command: provideInlineCompletionItems");
			return [];
		}
		gShowCompletion = false;
		logger.channel()?.info("----->");

        // 如果请求已被取消，则直接返回null
        if (token.isCancellationRequested) {
            logger.channel()?.info("request cancelled before completion");
            return [];
        }

		// 根据文档和位置计算补全项（这里仅作示例，实际实现可能会有所不同） 
		// 获取position前文本
		const documentText = document.getText();
		const offsetPos = document.offsetAt(position);

		// 获取position前文本
		const prefix = documentText.substring(0, offsetPos);
		const suffix = documentText.substring(offsetPos);

		// 获取剪贴板内存中数据
		const clipboardText = await vscode.env.clipboard.readText();
		const clipboardPrefix = `file: clipboard\n${clipboardText}`;

		// 前边编辑文件信息
		let editPrefix = "";
		for (let [fsPath, text] of editedFiles) {
			// 排除当前文档内容
			if (fsPath === document.uri.fsPath) {
				continue;
			}
			editPrefix += `file: ${fsPath}\n${text}\n`;
		}

		// ISSUE数据信息
		const issueURL = "https://github.com/continuedev/continue/issues/919";
		const issueTitle = "Write a funcion HttpClient to show http get in python";
		const issueBody = "Write a HttpClient function to make a http get request to some site.";

		const issuePrefix = `file: ${issueURL}\ntitle: ${issueTitle}\nbody: ${issueBody}`;

		// 文件prefix
		const curFilePrefix = `file: ${document.fileName}\n${prefix}`;

		const prompt = "<fim_prefix>" + issuePrefix + "\n" + clipboardPrefix + "\n" + editPrefix + "\n" + curFilePrefix + "<fim_suffix>" + suffix + "<fim_middle>";

		// call code_completion
		const response = await code_completion_local(prompt);
		if (!response) {
			logger.channel()?.info("finish provideInlineCompletionItems");
			return [];
		}

		logger.channel()?.info("finish provideInlineCompletionItems");
		return [new vscode.InlineCompletionItem(response[0], new vscode.Range(position, position))];  
    }  
}



    

async function activate(context: vscode.ExtensionContext) {
    ExtensionContextHolder.context = context;

    logger.init(LoggerChannelVscode.getInstance());
	UiUtilWrapper.init(new UiUtilVscode());
	
	await migrateConfig();

	const provider = new InlineCompletionProvider();  
    const selector = { pattern: "**" }; // 指定在 JavaScript 文件中触发此提供器  
    context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider(selector, provider));  

	let disposable = vscode.workspace.onDidChangeTextDocument((event) => {
		const fsPath = event.document.uri.fsPath;
        const activeEditor = vscode.window.activeTextEditor;

        if (activeEditor && activeEditor.document === event.document) {
            const firstVisibleRange = activeEditor.visibleRanges[0];
            const entireTextInFirstVisibleRange = activeEditor.document.getText(firstVisibleRange);
			// replace the old one
			let hasExist = false;
			for (let i = 0; i < editedFiles.length; i++) {
				if (editedFiles[i][0] === fsPath) {
					editedFiles[i][1] = entireTextInFirstVisibleRange;
					hasExist = true;
					return ;
				}
			}
			if (!hasExist) {
				editedFiles.push([fsPath, entireTextInFirstVisibleRange]);
			}
		}
    });

    context.subscriptions.push(disposable);

    regLanguageContext();

    regDevChatView(context);

    registerAccessKeySettingCommand(context);
	registerCompletionCommand(context);

    registerOpenChatPanelCommand(context);
    registerAddContextCommand(context);
    registerAskForCodeCommand(context);
    registerAskForFileCommand(context);
    registerStatusBarItemClickCommand(context);

	registerInstallCommandsCommand(context);
	registerUpdateChatModelsCommand(context);
	registerInstallCommandsPython(context);

    createStatusBarItem(context);

    regApplyDiffResultCommand(context);

    regPythonPathCommand(context);
	registerDevChatChatCommand(context);
	registerCodeLensProvider(context);

	startRpcServer();
	logger.channel()?.info(`registerHandleUri:`);
	registerHandleUri(context)
}

async function deactivate() {
	// stop devchat
	await stopDevChatBase({});
}
exports.activate = activate;
exports.deactivate = deactivate;