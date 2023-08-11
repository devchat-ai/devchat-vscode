/*
 Install DevChat with python=3.11.4
 */

import { logger } from "../logger";
import { appInstall } from "./app_install"

import * as path from 'path';
import * as fs from 'fs';


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
		logger.channel()?.info(`start installing devchat with python=3.11.4 ...`);
		isDevChatInstalling = true;
		const pythonCommand = await appInstall('devchat', '3.11.4');
		if (!pythonCommand) {
			logger.channel()?.error(`failed to install devchat with python=3.11.4`);
			logger.channel()?.show();
			isDevChatInstalling = false;
			return '';
		}

		// Get the directory of pythonCommand
		const pythonDirectory = path.dirname(pythonCommand);

		// Get the path of devchat
		let devchatPath = path.join(pythonDirectory, 'devchat');

		// Check if devchatPath exists, if not, try with 'Scripts' subdirectory
		if (!fs.existsSync(devchatPath)) {
			devchatPath = path.join(pythonDirectory, 'Scripts', 'devchat');
		}

		isDevChatInstalling = false;
		return devchatPath;
	} catch (error) {
		logger.channel()?.error(`${error}`);
		logger.channel()?.show();
		isDevChatInstalling = false;
		return '';
	}
}