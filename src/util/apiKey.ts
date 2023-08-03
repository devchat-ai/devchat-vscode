// src/apiKey.ts

import { UiUtilWrapper } from './uiUtil';

export class ApiKeyManager {
	static async getApiKey(llmType: string = "OpenAI"): Promise<string | undefined> {
		let apiKey: string|undefined = undefined;
		
		if (llmType === "OpenAI") {
			apiKey = await UiUtilWrapper.secretStorageGet("openai_OPENAI_API_KEY");
		} 
		if (!apiKey) {
			apiKey = await UiUtilWrapper.secretStorageGet("devchat_OPENAI_API_KEY");
		}
		
		if (!apiKey) {
			if (llmType === "OpenAI") {
				apiKey = UiUtilWrapper.getConfiguration('DevChat', 'Api_Key_OpenAI');
			}
			if (!apiKey) {
				apiKey = UiUtilWrapper.getConfiguration('DevChat', 'Access_Key_DevChat');
			}
		}
		if (!apiKey) {
			if (llmType === "OpenAI") {
				apiKey = process.env.OPENAI_API_KEY;
			}
		}
		return apiKey;
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