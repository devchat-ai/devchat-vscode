import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as childProcess from 'child_process';

import { parseArgsStringToArgv } from 'string-argv';

import { logger } from './logger';
import { spawn, exec } from 'child_process';
import { UiUtilWrapper } from './uiUtil';

export function createTempSubdirectory(subdir: string): string {
	// 获取系统临时目录
	const tempDir = os.tmpdir();
	// 构建完整的目录路径
	let targetDir = path.join(tempDir, subdir, Date.now().toString());
	// 检查目录是否存在，如果存在则重新生成目录名称
	while (fs.existsSync(targetDir)) {
		targetDir = path.join(tempDir, subdir, Date.now().toString());
	}
	// 递归创建目录
	fs.mkdirSync(targetDir, { recursive: true });
	// 返回创建的目录的绝对路径
	return targetDir;
}

export interface CommandResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
}

export class CommandRun {
	private childProcess: any;

	// init childProcess in construction function
	constructor() {
		this.childProcess = null;
	}

	public async spawnAsync(command: string, args: string[], options: object, onData: ((data: string) => void) | undefined, onError: ((data: string) => void) | undefined, onOutputFile: ((command: string, stdout: string, stderr: string) => string) | undefined, outputFile: string | undefined): Promise<CommandResult> {
		return new Promise((resolve, reject) => {
			logger.channel()?.info(`Running command: ${command} ${args.join(' ')}`);
			this.childProcess = spawn(command, args, options);

			let stdout = '';
			let stderr = '';

			this.childProcess.stdout.on('data', (data: { toString: () => any; }) => {
				const dataStr = data.toString();
				if (onData) {
					onData(dataStr);
				}
				stdout += dataStr;
			});

			this.childProcess.stderr.on('data', (data: string) => {
				const dataStr = data.toString();
				if (onError) {
					onError(dataStr);
				}
				stderr += dataStr;
			});

			this.childProcess.on('close', (code: number) => {
				let outputData = stdout;
				if (onOutputFile) {
					outputData = onOutputFile(command + " " + args.join(" "), stdout, stderr);
				}

				if (outputFile) {
					fs.writeFileSync(outputFile, outputData);
				}

				if (stderr) {
					logger.channel()?.error(stderr);
					logger.channel()?.show();
				}

				if (code === 0) {
					resolve({ exitCode: code, stdout, stderr });
				} else {
					resolve({ exitCode: code, stdout, stderr });
				}
			});

			// Add error event listener to handle command not found exception
			this.childProcess.on('error', (error: any) => {
				if (error.code === 'ENOENT') {
					logger.channel()?.error(`Command not found: ${command}`);
					logger.channel()?.show();
				} else {
					logger.channel()?.error(`Error occurred: ${error.message}`);
					logger.channel()?.show();
				}
				resolve({ exitCode: error.code, stdout: "", stderr: error.message });
			});
		});
	};

	public stop() {
		if (this.childProcess) {
			this.childProcess.kill();
			this.childProcess = null;
		}
	}
}

export async function runCommandAndWriteOutput(
	command: string,
	args: string[],
	outputFile: string | undefined
): Promise<CommandResult> {
	const run = new CommandRun();
	const options = {
		cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.',
	};

	return run.spawnAsync(command, args, options, undefined, undefined, undefined, outputFile);
}

export async function runCommandStringAndWriteOutput(
    commandString: string,
    outputFile: string
): Promise<CommandResult> {
    const run = new CommandRun();
    const options = {
        cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.'
    };

    // Split the commandString into command and args array using string-argv
    const commandParts = parseArgsStringToArgv(commandString);
    const command = commandParts[0];
    const args = commandParts.slice(1);

    const onOutputFile = (command: string, stdout: string, stderr: string): string => {
        const data = {
            command: commandString,
            content: stdout,
        };
        return JSON.stringify(data);
    };

    return run.spawnAsync(command, args, options, undefined, undefined, onOutputFile, outputFile);
}

export async function runCommandStringArrayAndWriteOutput(
    commandStringList: string[],
    outputFile: string
): Promise<CommandResult> {
    const run = new CommandRun();
    const options = {
        cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.'
    };

	const commandString = commandStringList[0];
	const args: string[] = commandStringList.slice(1);
    const onOutputFile = (command: string, stdout: string, stderr: string): string => {
        const data = {
            command: commandString,
            content: stdout,
        };
        return JSON.stringify(data);
    };

    return run.spawnAsync(commandString, args, options, undefined, undefined, onOutputFile, outputFile);
}

export async function getLanguageIdByFileName(fileName: string): Promise<string | undefined> {
	try {
		const languageId = await UiUtilWrapper.languageId(fileName);
		return languageId;
	} catch (error) {
		// 如果无法打开文件或发生其他错误，返回undefined
		return undefined;
	}
}

export function runCommand(command: string): string {
	return childProcess.execSync(command).toString();
}