// src/apiKey.ts

import { UiUtilWrapper } from './uiUtil';

export class ApiKeyManager {
	static toProviderKey(provider: string) : string | undefined {
		let providerNameMap = {
			"openai": "OpenAI",
			"cohere": "Cohere",
			"anthropic": "Anthropic",
			"replicate": "Replicate",
			"huggingface": "HuggingFace",
			"together_ai": "TogetherAI",
			"openrouter": "OpenRouter",
			"vertex_ai": "VertexAI",
			"ai21": "AI21",
			"baseten": "Baseten",
			"azure": "Azure",
			"sagemaker": "SageMaker",
			"bedrock": "Bedrock"
		};
		return providerNameMap[provider];
	}
	static async getApiKey(llmType: string = "OpenAI"): Promise<string | undefined> {
		const llmModelT = await this.llmModel();
		if (!llmModelT) {
			return undefined;
		}

		return llmModelT.api_key;
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

	static async llmModel() {
		let llmModelT = UiUtilWrapper.getConfiguration('devchat', 'defaultModel');
		if (!llmModelT) {
			const validModels = await this.getValidModels();
			if (validModels.length > 0) {
				await UiUtilWrapper.updateConfiguration('devchat', 'defaultModel', validModels[0]);
				llmModelT = validModels[0];
			} else {
				return undefined;
			}
		}

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
				const providerName = this.toProviderKey(modelConfig["provider"]);
				if (!providerName) {
					return undefined;
				}
				let apiKey = await this.loadApiKeySecret(providerName);
				if (!apiKey) {
					apiKey = await this.loadApiKeySecret("DevChat");
					if (!apiKey) {
						return undefined;
					}
				}

				modelProperties["api_key"] = apiKey;
			}

			if (!modelProperties["api_base"] && modelProperties["api_key"]?.startsWith("DC.")) {
				modelProperties["api_base"] = "https://api.devchat.ai/v1";
			}

			modelProperties['model'] = modelName;
			return modelProperties;
		};

		if (llmModelT === "gpt-3.5-turbo") {
			return await modelProperties('Model.gpt-3-5', "gpt-3.5-turbo");
		}
		if (llmModelT === "gpt-3.5-turbo-16k") {
			return await modelProperties('Model.gpt-3-5-16k', "gpt-3.5-turbo-16k");
		}
		if (llmModelT === "gpt-4") {
			return await modelProperties('Model.gpt-4', "gpt-4");
		}
		if (llmModelT === "claude-2") {
			return await modelProperties('Model.claude-2', "claude-2");
		}
		if (llmModelT === "xinghuo-2") {
			return await modelProperties('Model.xinghuo-2', "xinghuo-2");
		}
		if (llmModelT === "chatglm_pro") {
			return await modelProperties('Model.chatglm_pro', "chatglm_pro");
		}
		if (llmModelT === "ERNIE-Bot") {
			return await modelProperties('Model.ERNIE-Bot', "ERNIE-Bot");
		}
		if (llmModelT === "llama-2-13b-chat") {
			return await modelProperties('Model.llama-2-13b-chat', "llama-2-13b-chat");
		}

		const customModelConfig: any = UiUtilWrapper.getConfiguration('devchat', 'customModel');
		if (!customModelConfig) {
			return undefined;
		}

		const customModels = customModelConfig as Array<any>;
		for (const model of customModels) {
			if (!model.model) {
				continue;
			}
			if (model.model === llmModelT) {
				let modelProperties: any = {};
				for (const key of Object.keys(model || {})) {
					const property = model![key];
					modelProperties[key] = property;
				}

				const modelProvider = model["model"].split('/')[0];
				const modelName = model["model"].split('/').slice(1).join('/');

				if (!model["api_key"]) {
					const providerName = this.toProviderKey(modelProvider);
					if (!providerName) {
						return undefined;
					}
					const apiKey = await this.loadApiKeySecret(providerName);
					if (!apiKey) {
						return undefined;
					}
					modelProperties["api_key"] = apiKey;
				}

				if (!model["api_base"] && modelProperties["api_key"]?.startsWith("DC.")) {
					modelProperties["api_base"] = "https://api.devchat.ai/v1";
				}

				modelProperties["provider"] = modelProvider;
				modelProperties["model"] = modelName;

				return modelProperties;
			}
		}

		return undefined;
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
}