// src/apiKey.ts

import { UiUtilWrapper } from './uiUtil';

export class ApiKeyManager {
	static toProviderKey(provider: string) : string | undefined {
		let providerNameMap = {
			"openai": "OpenAI",
			"devchat": "DevChat"
		};
		return providerNameMap[provider];
	}

	static async getValidModels(): Promise<string[]> {
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

			const apiKey = await this.getProviderApiKey(modelConfig["provider"]);
			if (apiKey) {
				modelProperties["api_key"] = apiKey;
			} else {
				const apiKeyDevChat = await this.getProviderApiKey("devchat");
				if (apiKeyDevChat) {
					modelProperties["api_key"] = apiKeyDevChat;
				} else {
					return undefined;
				}
			}
	
			modelProperties['model'] = modelName;
			return modelProperties;
		};
	
		let modelList : string[] = [];
		const openaiModel = await modelProperties('Model.gpt-3-5', "gpt-3.5-turbo");
		if (openaiModel) {
			modelList.push(openaiModel.model);
		}
		const openaiModel3 = await modelProperties('Model.gpt-4', "gpt-4");
		if (openaiModel3) {
			modelList.push(openaiModel3.model);
		}
		const openaiModel4 = await modelProperties('Model.gpt-4-turbo', "gpt-4-turbo-preview");
		if (openaiModel4) {
			modelList.push(openaiModel4.model);
		}
		const claude3sonnetModel = await modelProperties('Model.claude-3-sonnet', "claude-3-sonnet");
		if (claude3sonnetModel) {
			modelList.push(claude3sonnetModel.model);
		}
		const claude3opusModel = await modelProperties('Model.claude-3-opus', "claude-3-opus");
		if (claude3opusModel) {
			modelList.push(claude3opusModel.model);
		}
		const xinghuoModel = await modelProperties('Model.xinghuo-2', "xinghuo-3.5");
		if (xinghuoModel) {
			modelList.push(xinghuoModel.model);
		}
		const glmModel = await modelProperties('Model.chatglm_pro', "GLM-4");
		if (glmModel) {
			modelList.push(glmModel.model);
		}
		const erniebotModel = await modelProperties('Model.ERNIE-Bot', "ERNIE-Bot-4.0");
		if (erniebotModel) {
			modelList.push(erniebotModel.model);
		}
		const llamaCode2Model = await modelProperties('Model.CodeLlama-70b', "togetherai/codellama/CodeLlama-70b-Instruct-hf");
		if (llamaCode2Model) {
			modelList.push(llamaCode2Model.model);
		}
		const mixtralCode2Model = await modelProperties('Model.Mixtral-8x7B', "togetherai/mistralai/Mixtral-8x7B-Instruct-v0.1");
		if (mixtralCode2Model) {
			modelList.push(mixtralCode2Model.model);
		}
		const minimaxCode2Model = await modelProperties('Model.Minimax-abab6', "minimax/abab6-chat");
		if (minimaxCode2Model) {
			modelList.push(minimaxCode2Model.model);
		}
		const llama70BModel = await modelProperties('Model.llama-2-70b-chat', "llama-2-70b-chat");
		if (llama70BModel) {
			modelList.push(llama70BModel.model);
		}
	
		return modelList;
	}

	static async llmModel() {
		// inner function to update default model
		const updateDefaultModelWithValidModels = async () => {
			const validModels = await this.getValidModels();
			if (validModels.length > 0) {
				await UiUtilWrapper.updateConfiguration('devchat', 'defaultModel', validModels[0]);
				return validModels[0];
			} else {
				return undefined;
			}
		};

		// inner function to get model properties
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

			const apiKey = await this.getProviderApiKey(modelConfig["provider"]);
			const apiBase = await this.getProviderApiBase(modelConfig["provider"]);
			
			if (apiKey) {
				modelProperties["api_key"] = apiKey;
			} else {
				const apiKeyDevChat = await this.getProviderApiKey("devchat");
				if (apiKeyDevChat) {
					modelProperties["api_key"] = apiKeyDevChat;
				} else {
					return undefined;
				}
			}

			if (apiBase) {
				modelProperties["api_base"] = apiBase;
			} else if (!apiKey) {
				const devchatApiBase = await this.getProviderApiBase("devchat");
				if (devchatApiBase) {
					modelProperties["api_base"] = devchatApiBase;
				}
			}

			if (!modelProperties["api_base"] && modelProperties["api_key"]?.startsWith("DC.")) {
				modelProperties["api_base"] = "https://api.devchat.ai/v1";
			}

			modelProperties['model'] = modelName;
			return modelProperties;
		};

		// inner function visit all models
		const getModelPropertiesByName = async (modelName: string) => {
			if (modelName === "gpt-3.5-turbo") {
				return await modelProperties('Model.gpt-3-5', "gpt-3.5-turbo");
			}
			if (modelName === "gpt-4") {
				return await modelProperties('Model.gpt-4', "gpt-4");
			}
			if (modelName === "gpt-4-turbo-preview") {
				return await modelProperties('Model.gpt-4-turbo', "gpt-4-turbo-preview");
			}
			if (modelName === "claude-3-sonnet") {
				return await modelProperties('Model.claude-3-sonnet', "claude-3-sonnet");
			}
			if (modelName === "claude-3-opus") {
				return await modelProperties('Model.claude-3-opus', "claude-3-opus");
			}
			if (modelName === "xinghuo-3.5") {
				return await modelProperties('Model.xinghuo-2', "xinghuo-3.5");
			}
			if (modelName === "GLM-4") {
				return await modelProperties('Model.chatglm_pro', "GLM-4");
			}
			if (modelName === "ERNIE-Bot-4.0") {
				return await modelProperties('Model.ERNIE-Bot', "ERNIE-Bot-4.0");
			}
			if (modelName === "togetherai/codellama/CodeLlama-70b-Instruct-hf") {
				return await modelProperties('Model.CodeLlama-70b', "togetherai/codellama/CodeLlama-70b-Instruct-hf");
			}
			if (modelName === "togetherai/mistralai/Mixtral-8x7B-Instruct-v0.1") {
				return await modelProperties('Model.Mixtral-8x7B', "togetherai/mistralai/Mixtral-8x7B-Instruct-v0.1");
			}
			if (modelName === "minimax/abab6-chat") {
				return await modelProperties('Model.Minimax-abab6', "minimax/abab6-chat");
			}
			if (modelName === "llama-2-70b-chat") {
				return await modelProperties('Model.llama-2-70b-chat', "llama-2-70b-chat");
			}
			return undefined;
		};

		let llmModelT: string | undefined = UiUtilWrapper.getConfiguration('devchat', 'defaultModel');
		if (llmModelT) {
			const defaultModel = await getModelPropertiesByName(llmModelT);
			if (defaultModel) {
				return defaultModel;
			}
		}

		// reset default model
		llmModelT = await updateDefaultModelWithValidModels();
		if (!llmModelT) {
			return undefined;
		}
		return getModelPropertiesByName(llmModelT);
	}

	static getKeyType(apiKey: string): string | undefined {
		if (apiKey.startsWith("sk-")) {
			return "sk";
		} else if (apiKey.startsWith("DC.")) {
			return "DC";
		} else {
			return undefined;
		}
	}

	static async writeApiKeySecret(apiKey: string, llmType: string = "Unknow"): Promise<void> {
		await UiUtilWrapper.storeSecret(`Access_KEY_${llmType}`, apiKey);
	}
	static async loadApiKeySecret(llmType: string = "Unknow"): Promise<string | undefined> {
		return await UiUtilWrapper.secretStorageGet(`Access_KEY_${llmType}`);
	}

	// get some provider's api key
	static async getProviderApiKey(provider: string): Promise<string | undefined> {
		// read key from configration first
		const providerProperty = `Provider.${provider}`;
		const providerConfig = UiUtilWrapper.getConfiguration("devchat", providerProperty);
		if (providerConfig) {
			if (providerConfig["access_key"]) {
				return providerConfig["access_key"];
			}
		}

		const providerName = this.toProviderKey(provider);
		if (!providerName) {
			return undefined;
		}
		return await this.loadApiKeySecret(providerName);
	}

	// get some provider's api base
	static async getProviderApiBase(provider: string): Promise<string | undefined> {
		// read key from configration first
		const providerProperty = `Provider.${provider}`;
		const providerConfig = UiUtilWrapper.getConfiguration("devchat", providerProperty);
		if (providerConfig) {
			if (providerConfig["api_base"]) {
				return providerConfig["api_base"];
			}
		}

		return undefined;
	}
}