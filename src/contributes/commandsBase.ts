// src/contributes/commandsBase.ts

import { UiUtilWrapper } from "../util/uiUtil";
import { runCommand } from "../util/commonUtil";
import { logger } from "../util/logger";
import path from "path";

let pipxPathStatus = '';
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

export function checkDevChatDependency(pythonCommand: string, showError: boolean = true): boolean {
	let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
	if (!devChat) {
		return false;
	}

	try {
		// Check if DevChat is installed
		runCommand(`"${devChat}" --help`);
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
		const pythonCommand = UiUtilWrapper.getConfiguration('DevChat', 'PythonPath');
		if (pythonCommand) {
			return pythonCommand;
		}

		const defaultPythonCommand = getDefaultPythonCommand();
		if (defaultPythonCommand) {
			UiUtilWrapper.updateConfiguration('DevChat', 'PythonPath', defaultPythonCommand);
		}

		return defaultPythonCommand;
	} catch (error) {
		return undefined;
	}
}

export function getPipxEnvironmentPath(pythonCommand: string): string | undefined {
	// Get pipx environment
	try {
		const pipxEnvOutput = runCommand(`"${pythonCommand}" -m pipx environment`).toString();
		const binPathRegex = /PIPX_BIN_DIR=\s*(.*)/;

		// Get BIN path from pipx environment
		const match = pipxEnvOutput.match(binPathRegex);
		if (match && match[1]) {
			return match[1];
		} else {
			return undefined;
		}
	} catch (error) {
		return undefined;
	}
}

function updateEnvironmentPath(binPath: string): void {
	// Add BIN path to PATH
	if (process.env.PATH?.indexOf(binPath) === undefined || process.env.PATH?.indexOf(binPath) < 0) {
		process.env.PATH = `${binPath}:${process.env.PATH}`;
		logger.channel()?.info(`Added ${binPath} to PATH.`);
	}
}