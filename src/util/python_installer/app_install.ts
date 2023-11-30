/*
 Install devchat
 */

import { logger } from "../logger";
import { installConda } from "./conda_install";
import { getMicromambaUrl } from "./conda_url";
import { installPackage } from "./package_install";
import { installPython, installPythonMicromamba } from "./python_install";

// step 1. install conda
// step 2. create env with python 3.11.4
// step 3. install devchat in the env


export async function createEnvByMamba(pkgName: string, pkgVersion: string, pythonVersion: string) : Promise<string> {
	logger.channel()?.info('Find micromamba ...');
	const mambaCommand = getMicromambaUrl();
	logger.channel()?.info('micromamba url: ' + mambaCommand);

	// create env with specify python
	logger.channel()?.info('Create env ...');
	let pythonCommand = '';
	// try 3 times
	for (let i = 0; i < 3; i++) {
		try {
			pythonCommand = await installPythonMicromamba(mambaCommand, pkgName, pythonVersion);
			if (pythonCommand) {
				break;
			}
		} catch(error) {
			logger.channel()?.info(`Exception: ${error}`);
		}
		
		logger.channel()?.info(`Create env failed, try again: ${i + 1}`);
	}

	return pythonCommand;
}

export async function createEnvByConda(pkgName: string, pkgVersion: string, pythonVersion: string) : Promise<string> {
	// install conda
	logger.channel()?.info('Install conda ...');
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
		try {
			pythonCommand = await installPython(condaCommand, pkgName, pythonVersion);
			if (pythonCommand) {
				break;
			}
		} catch(error) {
			logger.channel()?.info(`Exception: ${error}`);
		}
		
		logger.channel()?.info(`Create env failed, try again: ${i + 1}`);
	}

	return pythonCommand;
}

export async function appInstall(pkgName: string, pkgVersion: string, pythonVersion: string) : Promise<string> {
	logger.channel()?.info(`create env for python ...`);
	logger.channel()?.info(`try to create env by mamba ...`);
	let pythonCommand = await createEnvByMamba(pkgName, pkgVersion, pythonVersion);

	if (!pythonCommand || pythonCommand === "") {
		logger.channel()?.info(`create env by mamba failed, try to create env by conda ...`);
		pythonCommand = await createEnvByConda(pkgName, pkgVersion, pythonVersion);
	}
	
	if (!pythonCommand) {
		logger.channel()?.error('Create env failed');
		logger.channel()?.show();
		return '';
	}
	logger.channel()?.info(`Create env success: ${pythonCommand}`);

	// install devchat in the env
	logger.channel()?.info('Install python packages ...');
	let isInstalled = false;
	// try 3 times
	for (let i = 0; i < 4; i++) {
		let otherSource: string | undefined = undefined;
		if (i>1) {
			otherSource = 'https://pypi.tuna.tsinghua.edu.cn/simple/';
		}
		isInstalled = await installPackage(pythonCommand, pkgName + pkgVersion, otherSource);
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