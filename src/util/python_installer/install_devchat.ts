/*
 Install DevChat with python=3.11.4
 */

import { logger } from "../logger";
import { appInstall, createEnvByConda, createEnvByMamba } from "./app_install";

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { UiUtilWrapper } from "../uiUtil";
import { DevChatConfig } from "../config";
import { getValidPythonCommand } from "../../contributes/commandsBase";


let isDevChatInstalling: boolean | undefined = undefined;

export function isDevchatInstalling(): boolean {
	if (isDevChatInstalling === true) {
		return true;
	}
	return false;
}

// python version: 3.11.4
// pkg name: devchat
// return: path to devchat, devchat is located in the same directory as python
export async function installDevchat(): Promise<string> {
	try {
		// if current os is windows, we don't need to install devchat
		if (os.platform() === "win32" && os.arch() === "x64") {
			// rewrite ._pth file in python directory
			const arch = os.arch();
			const targetPythonPath = os.arch() === "x64"? "python-3.11.6-embed-amd64" : "python-3.11.6-embed-arm64";
			const pythonTargetPath = path.join(UiUtilWrapper.extensionPath(), "tools", targetPythonPath);
			const pythonApp = path.join(pythonTargetPath, "python.exe");
			const pythonPathFile = path.join(pythonTargetPath, "python311._pth");
			const sitepackagesPath = path.join(UiUtilWrapper.extensionPath(), "tools", "site-packages");
			
			const userHomeDir = os.homedir();
			// TODO: temperary workflow base dir name, need to change
			const WORKFLOWS_BASE_NAME = "new_wf";
            const workflow_base_path = path.join(userHomeDir, ".chat", WORKFLOWS_BASE_NAME);

			const new_python_path = [workflow_base_path, sitepackagesPath].join("\n");

			// read content in pythonPathFile
			let content = fs.readFileSync(pythonPathFile, { encoding: 'utf-8' });
			// replace %PYTHONPATH% with sitepackagesPath
			content = content.replace(/%PYTHONPATH%/g, new_python_path);
			// write content to pythonPathFile
			fs.writeFileSync(pythonPathFile, content);

			// update DevChat.PythonForChat configration
			await DevChatConfig.getInstance().set("python_for_chat", pythonApp);
			return pythonApp;
		} else {
			// if current os is not windows, we need to get default python path
			const pythonPath = getValidPythonCommand();
			if (pythonPath) {
				return pythonPath;
			}

			logger.channel()?.info(`create env for python ...`);
			logger.channel()?.info(`try to create env by mamba ...`);
			let pythonCommand = await createEnvByMamba("devchat", "", "3.11.4");

			if (!pythonCommand || pythonCommand === "") {
				logger.channel()?.info(`create env by mamba failed, try to create env by conda ...`);
				pythonCommand = await createEnvByConda("devchat", "", "3.11.4");
			}
			
			if (!pythonCommand) {
				logger.channel()?.error('Create env failed');
				logger.channel()?.show();
				return '';
			}
			logger.channel()?.info(`Create env success: ${pythonCommand}`);

			await DevChatConfig.getInstance().set("python_for_chat", pythonCommand);
			return pythonCommand;
		}
	} catch (error) {
		logger.channel()?.error(`${error}`);
		logger.channel()?.show();
		isDevChatInstalling = false;
		return '';
	}
}