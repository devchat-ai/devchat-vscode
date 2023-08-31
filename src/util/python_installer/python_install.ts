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

function canCreateSubdirectory(dirPath: string): boolean {
    try {
        const tempSubdirPath = path.join(dirPath, 'tempSubdirTest');
        fs.mkdirSync(tempSubdirPath);
        fs.rmdirSync(tempSubdirPath);

        return true;
    } catch (err) {
        return false;
    }
}


export async function installPythonMicromamba(mambaCommandPath: string, envName: string, pythonVersion: string): Promise<string> {
	// Set the installation directory for conda
    let userHome = process.platform === 'win32' ? fs.realpathSync(process.env.USERPROFILE || '') : process.env.HOME;
	if (os.platform() === 'win32' && /[^\x00-\xFF]/.test(userHome)) {
		if (fs.existsSync('C:/Program Files') && canCreateSubdirectory('C:/Program Files')) {
			userHome = 'C:/Program Files';
		} else if (fs.existsSync('D:/Program Files') && canCreateSubdirectory('D:/Program Files')) {
			userHome = 'D:/Program Files';
		} else if (fs.existsSync('E:/Program Files') && canCreateSubdirectory('E:/Program Files')) {
			userHome = 'E:/Program Files';
		}
	}
    const pathToMamba = `${userHome}/.chat/mamba`;

	const envPath = path.resolve(pathToMamba, 'envs', envName);
	let pythonPath;
	let pythonPath2;
	if (os.platform() === 'win32') {
	  pythonPath = path.join(envPath, 'Scripts', 'python.exe');
	  pythonPath2 = path.join(envPath, 'python.exe');
	} else {
	  pythonPath = path.join(envPath, 'bin', 'python');
	}
  
	if (fs.existsSync(pythonPath)) {
		return pythonPath;
	} else if (pythonPath2 && fs.existsSync(pythonPath2)) {
		return pythonPath2;
	}
  
	return new Promise<string>((resolve, reject) => {
	  const cmd = mambaCommandPath;
	  const args = ['create', '-n', envName, '-c', 'conda-forge', '-r', pathToMamba, `python=${pythonVersion}`, '--yes'];
	  // output command and args in line
	  // args to "create -n xx -c conda-forge ..."
	  logger.channel()?.info(`cmd: ${cmd} ${args.join(' ')}`);
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