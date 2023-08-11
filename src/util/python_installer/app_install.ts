/*
 Install devchat
 */

import { logger } from "../logger";
import { installConda } from "./conda_install";
import { installPackage } from "./package_install";
import { installPython } from "./python_install";

// step 1. install conda
// step 2. create env with python 3.11.4
// step 3. install devchat in the env

export async function appInstall(pkgName: string, pythonVersion: string) : Promise<string> {
	// install conda
	logger.channel()?.info('Install conda ...')
	const condaCommand = await installConda();
	if (!condaCommand) {
		logger.channel()?.error('Install conda failed');
		logger.channel()?.show();
		return '';
	}

	// create env with specify python
	logger.channel()?.info('Create env ...');
	let pythonCommand = '';
	// try 3 times
	for (let i = 0; i < 3; i++) {
		pythonCommand = await installPython(condaCommand, pkgName, pythonVersion);
		if (pythonCommand) {
			break;
		}
		logger.channel()?.info(`Create env failed, try again: ${i + 1}`);
	}
	if (!pythonCommand) {
		logger.channel()?.error('Create env failed');
		logger.channel()?.show();
		return '';
	}
	logger.channel()?.info(`Create env success: ${pythonCommand}`);

	// install devchat in the env
	logger.channel()?.info('Install python packages ...')
	let isInstalled = false;
	// try 3 times
	for (let i = 0; i < 3; i++) {
		isInstalled = await installPackage(pythonCommand, pkgName);
		if (isInstalled) {
			break;
		}
		logger.channel()?.info(`Install packages failed, try again: ${i + 1}`);
	}
	if (!isInstalled) {
		logger.channel()?.error('Install packages failed');
		logger.channel()?.show();
		return '';
	}
	
	return pythonCommand;
}