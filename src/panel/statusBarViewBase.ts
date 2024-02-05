import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { ApiKeyManager } from '../util/apiKey';
import { installDevchat } from '../util/python_installer/install_devchat';



function getExtensionVersion(): string {
	const packageJsonPath = path.join(UiUtilWrapper.extensionPath(), 'package.json');
	const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonContent);

	return packageJson.version;
}

let devchatStatus = '';
let apiKeyStatus = '';

let preDevchatStatus = '';
let preApiKeyStatus = '';

export async function dependencyCheck(): Promise<[string, string]> {
	// there are some different status of devchat:
	// 0. not checked
	// 1. has statisfied the dependency
	// 2. is installing
	// 3. install failed
	// 4. install success

	// key status:
	// 0. not checked
	// 1. invalid or not set
	// 2. valid key

	// define subfunction to check devchat dependency
	const getDevChatStatus = async (): Promise<string> => {
		if (devchatStatus === '') {
			devchatStatus = 'installing devchat';
			const devchatCommandEnv = await installDevchat();
			if (devchatCommandEnv) {
				logger.channel()?.info(`Python: ${devchatCommandEnv}`);
				devchatStatus = 'DevChat has been installed';
				return devchatStatus;
			} else {
				logger.channel()?.info(`Python: undefined`);

				devchatStatus = 'An error occurred during the installation of DevChat';
				return devchatStatus;
			}
		} else if (devchatStatus === 'has statisfied the dependency') {
			return devchatStatus;
		} else if (devchatStatus === 'installing devchat') {
			return devchatStatus;
		} else if (devchatStatus === 'DevChat has been installed') {
			return devchatStatus;
		} else if (devchatStatus === 'An error occurred during the installation of DevChat') {
			return devchatStatus;
		}
		return "";
	};

	// define subfunction to check api key
	const getApiKeyStatus = async (): Promise<string> => {
		if (apiKeyStatus === '' || apiKeyStatus === 'Click "DevChat" status icon to set key') {
			const accessKey = await ApiKeyManager.getApiKey();
			if (accessKey) {
				apiKeyStatus = 'has valid access key';
				return apiKeyStatus;
			} else {
				// test whether valid model exists
				const modelList = await ApiKeyManager.getValidModels();
				if (modelList && modelList.length > 0) {
					// update default llm model
					await UiUtilWrapper.updateConfiguration('devchat', 'defaultModel', modelList[0]);
					apiKeyStatus = 'has valid access key';
					return apiKeyStatus;
				}
				apiKeyStatus = 'Click "DevChat" status icon to set key';
				return apiKeyStatus;
			}
		} else {
			return apiKeyStatus;
		}
	};

	const devchatPackageStatus = await getDevChatStatus();
	const apiAccessKeyStatus = await getApiKeyStatus();

	if (devchatPackageStatus !== preDevchatStatus) {
		logger.channel()?.info(`devchat status: ${devchatPackageStatus}`);
		preDevchatStatus = devchatPackageStatus;
	}
	if (apiAccessKeyStatus !== preApiKeyStatus) {
		logger.channel()?.info(`api key status: ${apiAccessKeyStatus}`);
		preApiKeyStatus = apiAccessKeyStatus;
	}

	return [devchatPackageStatus, apiAccessKeyStatus];
}