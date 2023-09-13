// src/apiKey.ts

import { UiUtilWrapper } from './uiUtil';

export class ApiKeyManager {
	static async getApiKey(llmType: string = "OpenAI"): Promise<string | undefined> {
		const llmModel = this.llmModel();
		if (!llmModel) {
			return undefined;
		}

		return llmModel.api_key;
	}

	static llmModel() {
		const llmModel = UiUtilWrapper.getConfiguration('devchat', 'defaultModel');
		if (!llmModel) {
			return undefined;
		}

		const modelProperties = (modelPropertyName: string, modelName: string) => {
			const modelConfig = UiUtilWrapper.getConfiguration("devchat", modelPropertyName);
			if (!modelConfig) {
			return undefined;
			}

			let modelProperties: any = {};
			for (const key of Object.keys(modelConfig || {})) {
				const property = modelConfig![key];
				modelProperties[key] = property;
			}

			if (!modelConfig["provider"] || !modelConfig["api_key"]) {
				return undefined;
			}
			modelProperties['model'] = modelName;

			return modelProperties;
		};

		if (llmModel === "gpt-3.5-turbo") {
			return modelProperties('Model.gpt-3-5', "gpt-3.5-turbo");
		}
		if (llmModel === "gpt-3.5-turbo-16k") {
			return modelProperties('Model.gpt-3-5-16k', "gpt-3.5-turbo-16k");
		}
		if (llmModel === "gpt-4") {
			return modelProperties('Model.gpt-4', "gpt-4");
		}
		if (llmModel === "claude-2") {
			return modelProperties('Model.claude-2', "claude-2");
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
			if (model.model === llmModel) {
				let modelProperties: any = {};
				for (const key of Object.keys(model || {})) {
					const property = model![key];
					modelProperties[key] = property;
				}

				if (!model["api_key"]) {
					return undefined;
				}

				const modelProvider = model["model"].split('/')[0];
				const modelName = model["model"].split('/').slice(1).join('/');

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
		if (apiKey.startsWith("sk-")) {
			await UiUtilWrapper.storeSecret("openai_OPENAI_API_KEY", apiKey);
		} else if (apiKey.startsWith("DC.")) {
			await UiUtilWrapper.storeSecret("devchat_OPENAI_API_KEY", apiKey);
		} else {
			if (llmType === "OpenAI") {
				await UiUtilWrapper.storeSecret("openai_OPENAI_API_KEY", apiKey);
			} else if (llmType === "DevChat") {
				await UiUtilWrapper.storeSecret("devchat_OPENAI_API_KEY", apiKey);
			}
		}
	}

	static getEndPoint(apiKey: string | undefined): string | undefined {
		let endPoint = UiUtilWrapper.getConfiguration('DevChat', 'API_ENDPOINT');
		if (!endPoint) {
			endPoint = process.env.OPENAI_API_BASE;
		}
		if (!endPoint && apiKey?.startsWith("DC.")) {
			endPoint = "https://api.devchat.ai/v1";
		}
		return endPoint;
	}
}