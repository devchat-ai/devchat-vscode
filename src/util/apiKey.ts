// src/apiKey.ts

import DevChat from '@/toolwrapper/devchat';
import { UiUtilWrapper } from './uiUtil';
import { DevChatConfig } from './config';
import { logger } from './logger';

export class ApiKeyManager {
	static async llmModel() {
		const devchatConfig = DevChatConfig.getInstance();
		const defaultModel = devchatConfig.get('default_model');
		if (!defaultModel) {
			return undefined;
		}

		// get model provider
		const defaultModelProvider = devchatConfig.get(['models', defaultModel, 'provider']);
		if (!defaultModelProvider) {
			return undefined;
		}

		// get provider config
		const defaultProvider = devchatConfig.get(['providers', defaultModelProvider]);
		const devchatProvider = devchatConfig.get(`providers.devchat`);

		let defaultModelConfig = devchatConfig.get(['models', defaultModel]);
		defaultModelConfig["model"] = defaultModel;
		if (defaultProvider) {
			for (const key of Object.keys(defaultProvider || {})) {
				const property = defaultProvider[key];
				defaultModelConfig[key] = property;
			}
			if (!defaultModelConfig["api_base"] && defaultProvider === "devchat") {
				defaultModelConfig["api_base"] = "https://api.devchat.ai/v1";
			}
			return defaultModelConfig;
		} else if (devchatProvider) {
			for (const key of Object.keys(devchatProvider || {})) {
				const property = devchatProvider[key];
				defaultModelConfig[key] = property;
			}
			if (!defaultModelConfig["api_base"]) {
				logger.channel()?.error("api_base is not set in devchat provider!!!");
				logger.channel()?.show();
			}
			if (!defaultModelConfig["api_base"]) {
				defaultModelConfig["api_base"] = "https://api.devchat.ai/v1";
			}
			return defaultModelConfig;
		} else {
			return undefined;
		}
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
}