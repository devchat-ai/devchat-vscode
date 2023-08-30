// src/contributes/commandsBase.ts

import { UiUtilWrapper } from "../util/uiUtil";
import { runCommand } from "../util/commonUtil";
import { logger } from "../util/logger";

let devchatStatus = '';

export function checkDevChatDependency(showError: boolean = true): boolean {
	let devChat: string | undefined = UiUtilWrapper.getConfiguration('DevChat', 'DevChatPath');
	if (!devChat) {
		return false;
	}

	try {
		// Check if DevChat is installed
		const expectVersion = 'DevChat 0.2.3';
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


