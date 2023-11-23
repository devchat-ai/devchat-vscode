// src/contributes/commandsBase.ts

import { UiUtilWrapper } from "../util/uiUtil";
import { runCommand } from "../util/commonUtil";
import { logger } from "../util/logger";

let devchatStatus = '';



function locateCommand(command): string | undefined {
	try {
		// split lines and choose first line
		const binPaths = runCommand(`where ${command}`).toString().trim().split('\n');
		return binPaths[0].trim();
	} catch (error) {
		try {
			const binPaths = runCommand(`which ${command}`).toString().trim().split('\n');
			return binPaths[0].trim();
		} catch (error) {
			return undefined;
		}
	}
}

function getDefaultPythonCommand(): string | undefined {
	try {
		runCommand('python3 -V');
		return locateCommand('python3');
	} catch (error) {
		try {
			const version = runCommand('python -V');
			if (version.includes('Python 3')) {
				return locateCommand('python');
			}
			return undefined;
		} catch (error) {
			return undefined;
		}
	}
}

export function getValidPythonCommand(): string | undefined {
	try {
		const pythonCommand = UiUtilWrapper.getConfiguration('DevChat', 'PythonForChat');
		if (pythonCommand) {
			return pythonCommand;
		}

		const defaultPythonCommand = getDefaultPythonCommand();
		if (defaultPythonCommand) {
			UiUtilWrapper.updateConfiguration('DevChat', 'PythonForChat', defaultPythonCommand);
		}

		return defaultPythonCommand;
	} catch (error) {
		return undefined;
	}
}

export function checkDevChatDependency(showError: boolean = true): boolean {
	let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
	if (!devChat) {
		return false;
	}

	try {
		// Check if DevChat is installed
		const expectVersion = 'DevChat 0.2.10';
		const devchatVersion = runCommand(`"${devChat}" --version`).toString().trim();
		if (devchatVersion < expectVersion) {
			logger.channel()?.info(`devchat version: ${devchatVersion}, but expect version: ${expectVersion}`);
			return false;
		}

		logger.channel()?.info("devchat has installed.")
		return true;
	} catch(error) {
		const error_status = `Failed to check DevChat dependency due to error: ${error}`;
		if (devchatStatus !== error_status && showError) {
			logger.channel()?.warn(error_status);
			logger.channel()?.show();
			devchatStatus = error_status;
		}

		return false;
	}
}


