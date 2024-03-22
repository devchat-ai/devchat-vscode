// src/apiKey.ts

import DevChat from '@/toolwrapper/devchat';
import { UiUtilWrapper } from './uiUtil';
import { DevChatConfig } from './config';
import { logger } from './logger';

export class ApiKeyManager {
	static async llmModel() {
		const defaultModel = new DevChatConfig().get('default_model');
		if (!defaultModel) {
			return undefined;
		}

		// get model provider
		const defaultModelProvider = new DevChatConfig().get(`models.${defaultModel}.provider`);
		if (!defaultModelProvider) {
			return undefined;
		}

		// get provider config
		const defaultProvider = new DevChatConfig().get(`providers.${defaultModelProvider}`);
		const devchatProvider = new DevChatConfig().get(`providers.devchat`);

		let defaultModelConfig = new DevChatConfig().get(`models.${defaultModel}`);
		defaultModelConfig["model"] = defaultModel;
		if (defaultProvider) {
			for (const key of Object.keys(defaultProvider || {})) {
				const property = defaultProvider[key];
				defaultModelConfig[key] = property;
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