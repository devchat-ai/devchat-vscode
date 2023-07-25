import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { TopicManager } from "../topic/topicManager";
import { checkDevChatDependency, getPipxEnvironmentPath, getValidPythonCommand } from "../contributes/commandsBase";
import { ApiKeyManager } from '../util/apiKey';
import { CommandRun } from '../util/commonUtil';



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
		try {
			const versionOld = await UiUtilWrapper.secretStorageGet("DevChatVersionOld");
			const versionNew = getExtensionVersion();
			versionChanged = versionOld !== versionNew;
			UiUtilWrapper.storeSecret("DevChatVersionOld", versionNew!);

			isVersionChangeCompare = true;
			logger.channel()?.info(`versionOld: ${versionOld}, versionNew: ${versionNew}, versionChanged: ${versionChanged}`);
		} catch (error) {
			isVersionChangeCompare = false;
		}
	}
	
	const pythonCommand = getValidPythonCommand();
	if (!pythonCommand) {
		if (devchatStatus === '') {
			UiUtilWrapper.showErrorMessage('Missing required dependency: Python3');
			logger.channel()?.error('Missing required dependency: Python3');
			logger.channel()?.show();
		}
		
		devchatStatus = 'Missing required dependency: Python3';
	} else if (devchatStatus === 'Missing required dependency: Python3') {
		devchatStatus = '';
	}
	
	// status item has three status type
	// 1. not in a folder
	// 2. dependence is invalid
	// 3. ready
	if (devchatStatus === '' ||
		devchatStatus === 'An error occurred during the installation of DevChat' ||
		devchatStatus === 'DevChat has been installed') {
		let bOk = false;
		if (!bOk) {
			const showError = devchatStatus == ''? false : true;
			bOk = checkDevChatDependency(pythonCommand!, showError);
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
		const run = new CommandRun();
		const options = {
			cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.',
		};

		let errorInstall = false;
		let installLogs = '';
		await run.spawnAsync(pythonCommand!, [UiUtilWrapper.extensionPath() + "/tools/install.py"], options, 
		(data) => {
			installLogs += data;
			logger.channel()?.info(data.trim());
		}, 
		(data) => {
			errorInstall = true;
			logger.channel()?.info(data.trim());
		}, undefined, undefined);

		// UiUtilWrapper.runTerminal('DevChat Install', `${pythonCommand} "${UiUtilWrapper.extensionPath() + "/tools/install.py"}"`);
		const devchatCommandEnv = installLogs.match(/devchatCommandEnv:  (.*)/)?.[1];
		if (devchatCommandEnv) {
			logger.channel()?.info(`devchatCommandEnv: ${devchatCommandEnv}`);
			await UiUtilWrapper.updateConfiguration('DevChat', 'DevChatPath', devchatCommandEnv);
			devchatStatus = 'DevChat has been installed';
		} else {
			logger.channel()?.info(`devchatCommandEnv: undefined`);
			devchatStatus = 'An error occurred during the installation of DevChat';
		}

		isVersionChangeCompare = true;
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