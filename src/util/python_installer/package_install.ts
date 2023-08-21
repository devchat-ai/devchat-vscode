/*
 Install specific version of package. e.g. devchat
 */


import { spawn } from 'child_process';
import { logger } from '../logger';

// install specific version of package
// pythonCommand -m install pkgName
// if install success, return true
// else return false
export async function installPackage(pythonCommand: string, pkgName: string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
		let errorOut = '';

        const cmd = pythonCommand;
        const args = ['-m', 'pip', 'install', pkgName];
        const child = spawn(cmd, args);

        child.stdout.on('data', (data) => {
			logger.channel()?.info(`${data}`);
        });

        child.stderr.on('data', (data) => {
			logger.channel()?.error(`${data}`);
			logger.channel()?.show();
			errorOut += data;
        });

        child.on('error', (error) => {
            logger.channel()?.error(`exec error: ${error}`);
            logger.channel()?.show();
            resolve(false);
        });

        child.on('close', (code) => {
            if (code !== 0 && errorOut !== "") {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}