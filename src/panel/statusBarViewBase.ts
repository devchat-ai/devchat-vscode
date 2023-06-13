import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { TopicManager } from "../topic/topicManager";
import { checkDevChatDependency, getValidPythonCommand } from "../contributes/commandsBase";
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
	if (devchatStatus === '' || devchatStatus === 'Waiting for devchat installation to complete') {
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
			// check whether open a workspace
			if (UiUtilWrapper.workspaceFoldersFirstPath()) {
				TopicManager.getInstance().loadTopics();
			}
		} else {
			if (devchatStatus === '') {
				devchatStatus = 'not ready';
			}
		}
	}
	if (devchatStatus === 'not ready' || devchatStatus === 'Waiting for Python3 installation to complete') {
		// auto install devchat
		// check whether python3 exist
		const pythonCommand = getValidPythonCommand();
		if (!pythonCommand && devchatStatus === 'not ready') {
			UiUtilWrapper.showErrorMessage('Python3 not found.');
			devchatStatus = 'Waiting for Python3 installation to complete';
			isVersionChangeCompare = true;
		} else if (!pythonCommand) {
			// Waiting for Python3 installation to complete
		} else {
			UiUtilWrapper.runTerminal('DevChat Install', `${pythonCommand} ${UiUtilWrapper.extensionPath() + "/tools/install.py"}`);
			devchatStatus = 'Waiting for devchat installation to complete';
			isVersionChangeCompare = true;
		}
	}

	// check api key
	if (apiKeyStatus === '' || apiKeyStatus === 'Please set the API key') {
		const bOk = await ApiKeyManager.getApiKey();
		if (bOk) {
			apiKeyStatus = 'ready';
		} else {
			apiKeyStatus = 'Please set the API key';
		}
	}

	return [devchatStatus, apiKeyStatus];
}