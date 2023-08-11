import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../logger';
const fs = require('fs');

// Check if the environment already exists
export async function checkEnvExists(condaCommandPath: string, envName: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const condaCommand = path.resolve(condaCommandPath);
    const command = `${condaCommand} env list`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.channel()?.error(`Error checking environments`);
        logger.channel()?.show();
        reject(false);
      } else {
        const envs = stdout.split('\n').map(line => line.split(' ')[0]);
        resolve(envs.includes(envName));
      }
    });
  });
}

// Install env with specific python version
// conda create -n {envName} python={pythonVersion} --yes
// return: python in env path
export async function installPython(condaCommandPath: string, envName: string, pythonVersion: string): Promise<string> {
  const envExists = await checkEnvExists(condaCommandPath, envName);
  
  const condaCommand = path.resolve(condaCommandPath);
  const envPath = path.resolve(condaCommand, '..', '..', 'envs', envName);
  let pythonPath;
  let pythonPath2;
  if (os.platform() === 'win32') {
    pythonPath = path.join(envPath, 'Scripts', 'python.exe');
	pythonPath2 = path.join(envPath, 'python.exe');
  } else {
    pythonPath = path.join(envPath, 'bin', 'python');
  }

  if (envExists) {
	if (fs.existsSync(pythonPath)) {
		return pythonPath;
	} else if (pythonPath2 && fs.existsSync(pythonPath2)) {
		return pythonPath2;
	}
  }

  return new Promise<string>((resolve, reject) => {
    const cmd = condaCommand;
    const args = ['create', '-n', envName, `python=${pythonVersion}`, '--yes'];
    const child = spawn(cmd, args);

    child.stdout.on('data', (data) => {
		logger.channel()?.info(`${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on('error', (error) => {
      logger.channel()?.error(`Error installing python ${pythonVersion} in env ${envName}`);
      logger.channel()?.show();
      reject('');
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command exited with code ${code}`));
      } else {
		if (fs.existsSync(pythonPath)) {
			resolve(pythonPath);
		} else if (pythonPath2 && fs.existsSync(pythonPath2)) {
			resolve(pythonPath2);
		} else {
			reject(new Error(`No Python found`));
		}
      }
    });
  });
}