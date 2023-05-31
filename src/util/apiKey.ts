// src/apiKey.ts

import { UiUtilWrapper } from './uiUtil';

export class ApiKeyManager {
	static async getApiKey(): Promise<string | undefined> {
		let apiKey = await UiUtilWrapper.secretStorageGet("devchat_OPENAI_API_KEY");
		if (!apiKey) {
			apiKey = UiUtilWrapper.getConfiguration('DevChat', 'API_KEY');
		}
		if (!apiKey) {
			apiKey = process.env.OPENAI_API_KEY;
		}
		return apiKey;
	}

	static getKeyType(apiKey: string): string | undefined {
		if (apiKey.startsWith("sk.")) {
			return "sk";
		} else if (apiKey.startsWith("DC.")) {
			return "DC";
		} else {
			return undefined;
		}
	}

	static async writeApiKeySecret(apiKey: string): Promise<void> {
		await UiUtilWrapper.storeSecret("devchat_OPENAI_API_KEY", apiKey);
	}

	static getEndPoint(apiKey: string | undefined): string | undefined {
		let endPoint = UiUtilWrapper.getConfiguration('DevChat', 'API_ENDPOINT');
		if (!endPoint) {
			endPoint = process.env.OPENAI_API_BASE;
		}
		if (!endPoint && apiKey?.startsWith("DC.")) {
			endPoint = "https://xw4ymuy6qj.ap-southeast-1.awsapprunner.com/api/v1";
		}
		return endPoint;
	}
}