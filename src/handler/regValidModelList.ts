import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';
import { UiUtilWrapper } from '../util/uiUtil';


export async function getValidModels(): Promise<string[]> {
	const modelProperties = async (modelPropertyName: string, modelName: string) => {
		const modelConfig = UiUtilWrapper.getConfiguration("devchat", modelPropertyName);
		if (!modelConfig) {
			return undefined;
		}

		let modelProperties: any = {};
		for (const key of Object.keys(modelConfig || {})) {
			const property = modelConfig![key];
			modelProperties[key] = property;
		}
		if (!modelConfig["provider"]) {
			return undefined;
		}
		const providerProperty = "Provider." + modelConfig["provider"];
		const providerConfig = UiUtilWrapper.getConfiguration("devchat", providerProperty);
		if (providerConfig) {
			if (providerConfig["access_key"]) {
				modelProperties["api_key"] = providerConfig["access_key"];
			}
			if (providerConfig["api_base"]) {
				modelProperties["api_base"] = providerConfig["api_base"];
			}
		}
		
		if (!modelProperties["api_key"]) {
			const providerName = ApiKeyManager.toProviderKey(modelConfig["provider"]);
			if (!providerName) {
				return undefined;
			}
			let apiKey = await ApiKeyManager.loadApiKeySecret(providerName);
			if (!apiKey) {
				apiKey = await ApiKeyManager.loadApiKeySecret("DevChat");
				if (!apiKey) {
					return undefined;
				}
			}
			modelProperties["api_key"] = apiKey;
		}

		modelProperties['model'] = modelName;
		return modelProperties;
	};

	let modelList : string[] = [];
	const openaiModel = await modelProperties('Model.gpt-3-5', "gpt-3.5-turbo");
	if (openaiModel) {
		modelList.push(openaiModel.model);
	}
	const openaiModel2 = await modelProperties('Model.gpt-3-5-16k', "gpt-3.5-turbo-16k");
	if (openaiModel2) {
		modelList.push(openaiModel2.model);
	}
	const openaiModel3 = await modelProperties('Model.gpt-4', "gpt-4");
	if (openaiModel3) {
		modelList.push(openaiModel3.model);
	}
	const claudeModel = await modelProperties('Model.claude-2', "claude-2");
	if (claudeModel) {
		modelList.push(claudeModel.model);
	}
	const xinghuoModel = await modelProperties('Model.xinghuo-2', "xinghuo-2");
	if (xinghuoModel) {
		modelList.push(xinghuoModel.model);
	}
	const glmModel = await modelProperties('Model.chatglm_pro', "chatglm_pro");
	if (glmModel) {
		modelList.push(glmModel.model);
	}
	const erniebotModel = await modelProperties('Model.ERNIE-Bot', "ERNIE-Bot");
	if (erniebotModel) {
		modelList.push(erniebotModel.model);
	}
	const llama2Model = await modelProperties('Model.llama-2-13b-chat', "llama-2-13b-chat");
	if (llama2Model) {
		modelList.push(llama2Model.model);
	}
	
	const customModelConfig: any = UiUtilWrapper.getConfiguration('devchat', 'customModel');
	if (!customModelConfig) {
		return modelList;
	}

	const customModels = customModelConfig as Array<any>;
	for (const model of customModels) {
		if (!model.model) {
			continue;
		}

		const modelProvider = model["model"].split('/')[0];
		const modelName = model["model"].split('/').slice(1).join('/');

		if (!model["api_key"]) {
			const providerName = ApiKeyManager.toProviderKey(modelProvider);
			if (!providerName) {
				continue;
			}
			const apiKey = await ApiKeyManager.loadApiKeySecret(providerName);
			if (!apiKey) {
				continue;
			}
		}

		modelList.push(model["model"]);
	}

	return modelList;
}

regInMessage({command: 'regModelList'});
regOutMessage({command: 'regModelList', result: [{name: ''}]});
export async function regModelList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const modelList = await getValidModels();
	
	MessageHandler.sendMessage(panel, { command: 'regModelList', result: modelList });
	return;
}


