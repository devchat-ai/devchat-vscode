/*
 Install conda command
 Install file from https://repo.anaconda.com/miniconda/
 */

import { logger } from "../logger";
import { getCondaDownloadUrl } from "./conda_url";
import { downloadFile } from "./https_download";

import { exec, spawn } from 'child_process';
const fs = require('fs');
const path = require('path');


// Check whether conda has installed before installing conda.
// If "conda -V" runs ok, then conda has installed.
// If ~/.devchat/conda/bin/conda exists, then conda has installed.

// is "conda -V" ok? then find conda command
// is ~/.devchat/conda/bin/conda exists? then return ~/.devchat/conda/bin/conda
// find conda command by: with different os use diffenc command: which conda | where conda
async function isCondaInstalled(): Promise<string> {
  // whether conda -V runs ok
  const condaVersion = await runCommand('conda -V');
  if (condaVersion) {
    // find conda command by: with different os use diffenc command: which conda | where conda
    const os = process.platform;
    const command = os === 'win32' ? 'where conda' : 'which conda';
    const condaCommand = await runCommand(command);
    if (condaCommand) {
      const condaCommandLines = condaCommand.split('\n');
      return condaCommandLines[0].trim();
    }
  }

  // whether ~/.devchat/conda/bin/conda exists
  const os = process.platform;
  const userHome = os === 'win32' ? fs.realpathSync(process.env.USERPROFILE || '') : process.env.HOME;
  const pathToConda = `${userHome}/.chat/conda`;
  const condaPath = os === 'win32' ? `${pathToConda}/Scripts/conda.exe` : `${pathToConda}/bin/conda`;
  logger.channel()?.info(`checking conda path: ${condaPath}`); 
  const isCondaPathExists = fs.existsSync(condaPath);
  if (isCondaPathExists) {
    return condaPath;
  }

  logger.channel()?.info(`conda path: ${condaPath} not exists`); 
  return '';
}

function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve('');
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function checkPathExists(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    exec(`test -e ${path}`, (error, stdout, stderr) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// install file is an exe file or sh file
// according to different os, use different command to install conda, Installing in silent mode 
// install conda to USER_HOME/.devchat/conda
// return： conda command path
async function installCondaByInstallFile(installFileUrl: string) : Promise<string> {
    // Determine the operating system
    const os = process.platform;
    
    // Set the installation directory for conda
    const userHome = os === 'win32' ? fs.realpathSync(process.env.USERPROFILE || '') : process.env.HOME;
	const pathToConda = `${userHome}/.chat/conda`;
	// if pathToConda has exist, remove it first
	try {
		if (fs.existsSync(pathToConda)) {
			fs.rmSync(pathToConda, { recursive: true, force: true });
		}
	} catch (error) {
		logger.channel()?.error(`Error while deleting ${pathToConda}:`, error);
	}
    
    // Define the command to install conda based on the operating system
    let command = '';
    if (os === 'win32') {
        const winPathToConda = pathToConda.replace(/\//g, '\\');
        command = `start /wait "" "${installFileUrl}" /InstallationType=JustMe /AddToPath=0 /RegisterPython=0 /S /D=${winPathToConda}`;
    } else if (os === 'linux') {
        command = `bash "${installFileUrl}" -b -p "${pathToConda}"`;
    } else if (os === 'darwin') {
        command = `bash "${installFileUrl}" -b -p "${pathToConda}"`;
    } else {
        throw new Error('Unsupported operating system');
    }
    
    // Execute the command to install conda
    logger.channel()?.info(`install conda command: ${command}`);
    try {
        await executeCommand(command);
    
        // Return the path to the conda command
        let condaCommandPath = '';
        if (os === 'win32') {
            condaCommandPath = `${pathToConda}\\Scripts\\conda.exe`;
        } else {
            condaCommandPath = `${pathToConda}/bin/conda`;
        }
        
        return condaCommandPath;
    } catch(error) {
        logger.channel()?.error(`install conda failed: ${error}`);
        logger.channel()?.show();
        return '';
    }
}

// Helper function to execute a command
function executeCommand(command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
				logger.channel()?.error(`exec error: ${error}`);
				logger.channel()?.show();
                reject(error);
            } else {
                if (stderr) {
					logger.channel()?.error(`stderr: ${error}`);
					logger.channel()?.show();
                }
                if (stdout) {
					logger.channel()?.info(`${stdout}`);
                }
                resolve();
            }
        });
    });
}

export async function installConda() : Promise<string> {
	// step 1. check whether conda has installed
	// step 2. download install file
	// step 3. install conda by install file
	
	const condaCommand = await isCondaInstalled();
	if (condaCommand) {
		logger.channel()?.info(`conda has installed: ${condaCommand}`);
		return condaCommand;
	}

	const downloadInstallFile = getCondaDownloadUrl();
	if (!downloadInstallFile) {
		logger.channel()?.error(`get conda download url failed`);
		logger.channel()?.show();
		return '';
	}

	logger.channel()?.info(`conda download url: ${downloadInstallFile}`);
	let installFileLocal = '';
	// try 3 times
	for (let i = 0; i < 3; i++) {
		installFileLocal = await downloadFile(downloadInstallFile);
		if (installFileLocal && installFileLocal !== '') {
			break;
		}
		logger.channel()?.info(`download conda install file failed, try again ...`);
	}
	if (!installFileLocal || installFileLocal === '') {
		logger.channel()?.error(`download conda install file failed`);
		logger.channel()?.show();
		return '';
	}

	logger.channel()?.info(`conda install file: ${installFileLocal}`);
	const installedConda = await installCondaByInstallFile(installFileLocal);
	return installedConda;
}