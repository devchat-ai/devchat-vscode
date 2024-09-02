import { logger } from "../util/logger";

import { installDevchat } from '../util/python_installer/install_devchat';
import { ASSISTANT_NAME_EN } from '../util/constants';


let devchatStatus = '';

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
		const statuses = {
			installing: `installing ${ASSISTANT_NAME_EN}`,
			installed: `${ASSISTANT_NAME_EN} has been installed`,
			error: `An error occurred during the installation of ${ASSISTANT_NAME_EN}`
		}
		if (devchatStatus === '') {
			devchatStatus = statuses.installing;
			const devchatCommandEnv = await installDevchat();
			if (devchatCommandEnv) {
				logger.channel()?.info(`Python: ${devchatCommandEnv}`);
				devchatStatus = statuses.installed;
				return devchatStatus;
			} else {
				logger.channel()?.info(`Python: undefined`);

				devchatStatus = statuses.error;
				return devchatStatus;
			}
		} else if (devchatStatus === 'has statisfied the dependency') {
			return devchatStatus;
		} else if (devchatStatus === statuses.installing) {
			return devchatStatus;
		} else if (devchatStatus === statuses.installed) {
			return devchatStatus;
		} else if (devchatStatus === statuses.error) {
			return devchatStatus;
		}
		return "";
	};

	const devchatPackageStatus = await getDevChatStatus();

	if (devchatPackageStatus !== preDevchatStatus) {
		logger.channel()?.info(`${ASSISTANT_NAME_EN} status: ${devchatPackageStatus}`);
		preDevchatStatus = devchatPackageStatus;
	}

	return devchatPackageStatus;
}