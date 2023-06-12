// src/contributes/commandsBase.ts

import { runCommand } from "../util/commonUtil";
import { logger } from "../util/logger";


export function checkDevChatDependency(): boolean {
	try {
		const binPath = getPipxEnvironmentPath();

		if (binPath) {
			updateEnvironmentPath(binPath);

			// Check if DevChat is installed
			runCommand('devchat --help');
			return true;
		} else {
			logger.channel()?.error(`Failed to get pipx environment path, I will try to install pipx.`);
			logger.channel()?.show();
			return false;
		}
	} catch (error) {
		// DevChat dependency check failed
		// log out detail error message
		logger.channel()?.error(`Failed to check DevChat dependency: ${error}`);
		logger.channel()?.show();
		return false;
	}
}

export function getPipxEnvironmentPath(): string | null {
	// Get pipx environment
	const pipxEnvOutput = runCommand('python3 -m pipx environment').toString();
	const binPathRegex = /PIPX_BIN_DIR=\s*(.*)/;

	// Get BIN path from pipx environment
	const match = pipxEnvOutput.match(binPathRegex);
	if (match && match[1]) {
		return match[1];
	} else {
		return null;
	}
}

function updateEnvironmentPath(binPath: string): void {
	// Add BIN path to PATH
	process.env.PATH = `${binPath}:${process.env.PATH}`;
}