import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { TopicManager } from "../topic/topicManager";
import { checkDevChatDependency } from "../contributes/commandsBase";
import { ApiKeyManager } from '../util/apiKey';



function getExtensionVersion(): string {
	const packageJsonPath = path.join(UiUtilWrapper.extensionPath(), 'package.json');
	const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonContent);

	return packageJson.version;
}

let devchatStatus = '';
let apiKeyStatus = '';
let isVersionChangeCompare: boolean|undefined = undefined;
export async function dependencyCheck(): Promise<[string, string]> {
	let versionChanged = false;
	if (isVersionChangeCompare === undefined) {
		const versionOld = await UiUtilWrapper.secretStorageGet("DevChatVersionOld");
		const versionNew = getExtensionVersion();
		versionChanged = versionOld !== versionNew;
		UiUtilWrapper.storeSecret("DevChatVersionOld", versionNew!);

		isVersionChangeCompare = true;
		logger.channel()?.info(`versionOld: ${versionOld}, versionNew: ${versionNew}, versionChanged: ${versionChanged}`);
	}
	
	
	// status item has three status type
	// 1. not in a folder
	// 2. dependence is invalid
	// 3. ready
	if (devchatStatus === '' || devchatStatus === 'waiting install devchat') {
		let bOk = true;
		let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
		if (!devChat) {
			bOk = false;
		}

		if (!bOk) {
			bOk = checkDevChatDependency();
		}
		if (bOk && versionChanged) {
			bOk = false;
		}

		if (bOk) {
			devchatStatus = 'ready';
			TopicManager.getInstance().loadTopics();
		} else {
			if (devchatStatus === '') {
				devchatStatus = 'not ready';
			}
		}
	}
	if (devchatStatus === 'not ready') {
		// auto install devchat
		UiUtilWrapper.runTerminal('DevChat Install', `python ${UiUtilWrapper.extensionPath() + "/tools/install.py"}`);
		devchatStatus = 'waiting install devchat';
		isVersionChangeCompare = true;
	}

	// check api key
	if (apiKeyStatus === '' || apiKeyStatus === 'please set api key') {
		const bOk = await ApiKeyManager.getApiKey();
		if (bOk) {
			apiKeyStatus = 'ready';
		} else {
			apiKeyStatus = 'please set api key';
		}
	}

	return [devchatStatus, apiKeyStatus];
}