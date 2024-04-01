import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { ApiKeyManager } from '../util/apiKey';
import { installDevchat } from '../util/python_installer/install_devchat';


let devchatStatus = '';
let apiKeyStatus = '';

let preDevchatStatus = '';

export async function dependencyCheck(): Promise<string> {
	// there are some different status of devchat:
	// 0. not checked
	// 1. has statisfied the dependency
	// 2. is installing
	// 3. install failed
	// 4. install success

	// key status:
	// 0. not checked
	// 1. invalid or not set
	// 2. valid key

	// define subfunction to check devchat dependency
	const getDevChatStatus = async (): Promise<string> => {
		if (devchatStatus === '') {
			devchatStatus = 'installing devchat';
			const devchatCommandEnv = await installDevchat();
			if (devchatCommandEnv) {
				logger.channel()?.info(`Python: ${devchatCommandEnv}`);
				devchatStatus = 'DevChat has been installed';
				return devchatStatus;
			} else {
				logger.channel()?.info(`Python: undefined`);

				devchatStatus = 'An error occurred during the installation of DevChat';
				return devchatStatus;
			}
		} else if (devchatStatus === 'has statisfied the dependency') {
			return devchatStatus;
		} else if (devchatStatus === 'installing devchat') {
			return devchatStatus;
		} else if (devchatStatus === 'DevChat has been installed') {
			return devchatStatus;
		} else if (devchatStatus === 'An error occurred during the installation of DevChat') {
			return devchatStatus;
		}
		return "";
	};

	const devchatPackageStatus = await getDevChatStatus();

	if (devchatPackageStatus !== preDevchatStatus) {
		logger.channel()?.info(`devchat status: ${devchatPackageStatus}`);
		preDevchatStatus = devchatPackageStatus;
	}

	return devchatPackageStatus;
}