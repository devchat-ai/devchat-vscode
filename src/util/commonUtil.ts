/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import * as util from 'util';
import * as childProcess from 'child_process';

import { parseArgsStringToArgv } from 'string-argv';

import { logger } from './logger';
import { spawn, exec } from 'child_process';
import { UiUtilWrapper } from './uiUtil';
import { ApiKeyManager } from './apiKey';
var kill = require('tree-kill');


async function createOpenAiKeyEnv() {
	let envs = {...process.env};
	const llmModelData = await ApiKeyManager.llmModel();
	if (llmModelData && llmModelData.api_key) {
		envs['OPENAI_API_KEY'] = llmModelData.api_key;
	}
    
	if (llmModelData && llmModelData.api_base) {
		envs['OPENAI_API_BASE'] = llmModelData.api_base;
		envs['OPENAI_BASE_URL'] = llmModelData.api_base;
	}

	return envs;
}
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
	private _input: string;

	// init childProcess in construction function
	constructor() {
		this._input = "";
		this.childProcess = null;
	}

    public async spawnAsync(command: string, args: string[], options: object, onData: ((data: string) => void) | undefined, onError: ((data: string) => void) | undefined, onOutputFile: ((command: string, stdout: string, stderr: string) => string) | undefined, outputFile: string | undefined): Promise<CommandResult> {
        return new Promise((resolve, reject) => {
			const maxLength = 150;
			const commandAndArgs = `${command} ${args.join(' ')}`;
			const truncatedCommandAndArgs = commandAndArgs.length > maxLength ? commandAndArgs.substring(0, maxLength) + '...' : commandAndArgs;
			logger.channel()?.debug(`Running command: ${truncatedCommandAndArgs}`);
			logger.channel()?.trace(`Running command: ${command} ${args.join(' ')}`);

            this._input = "";
            const argsNew: string[] = args.map((arg) => {
                if (arg.trim()[0] === '$') {
                    const restStr = arg.trim().slice(1);
                    if (process.env[restStr]) {
                        return process.env[restStr]!;
                    } else {
                        return arg;
                    }
                } else {
                    return arg;
                }
            });

            this.childProcess = spawn(command, argsNew, options);

            let stdout = '';
            let stderr = '';

            // Record process start time
            const startTime = process.hrtime();

            this.childProcess.stdout.on('data', (data: { toString: () => any; }) => {
                const dataStr = this._input + data.toString();
                this._input = "";
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

                if (stderr && !onError) {
                    logger.channel()?.error(stderr);
                    logger.channel()?.show();
                }

                this.childProcess = null;
                if (code === 0) {
                    resolve({ exitCode: code, stdout, stderr });
                } else {
                    resolve({ exitCode: code, stdout, stderr });
                }

                // Record process end time and calculate duration
                const endTime = process.hrtime(startTime);
                const duration = endTime[0] + endTime[1] / 1e9;
                logger.channel()?.debug(`Process took ${duration} seconds`);
            });

            this.childProcess.on('error', (error: any) => {
                this.childProcess = null;
                let errorMessage = error.message;
                if (error.code === 'ENOENT') {
                    errorMessage = `Command not found: ${command}`;
                    logger.channel()?.error(`Command "${command}" not found`);
                    logger.channel()?.show();
                } else {
                    logger.channel()?.error(`Error: ${error.message}`);
                    logger.channel()?.show();
                }
                resolve({ exitCode: error.code, stdout: "", stderr: errorMessage });
            });
        });
    };

	public write(input: string) {
		if (this.childProcess) {
			this._input += input;
			this.childProcess.stdin.write(input);
		}
	}

	public stop() {
		if (this.childProcess) {
			kill(this.childProcess.pid, 'SIGKILL', (err) => {
				if (err) {
					logger.channel()?.error('Failed to kill process tree:', err);
				}
			});
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
		env: await createOpenAiKeyEnv()
	};

	return run.spawnAsync(command, args, options, undefined, undefined, undefined, outputFile);
}

export async function runCommandStringAndWriteOutput(
    commandString: string,
    outputFile: string | undefined
): Promise<CommandResult> {
    const run = new CommandRun();
    const options = {
        cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.',
		env: await createOpenAiKeyEnv()
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
        cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.',
		env: await createOpenAiKeyEnv()
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

export function runCommandStringAndWriteOutputSync(command: string, outputFile: string): CommandResult {
	try {
		const options = {
			cwd: UiUtilWrapper.workspaceFoldersFirstPath() || '.'
		};
		const output = childProcess.execSync(command, options).toString();
		const onOutputFile = (command: string, stdout: string): string => {
			const data = {
				"command": command,
				"content": stdout,
			};
			return JSON.stringify(data);
		};
		fs.writeFileSync(outputFile, onOutputFile(command, output));
		return { exitCode: 0, stdout: output, stderr: '' };
	} catch (error) {
		logger.channel()?.error(`Error occurred: ${error}`);
		logger.channel()?.show();
		return { exitCode: 1, stdout: '', stderr: String(error) };
	}
}

export function gitLsTree(withAbsolutePath: boolean = false): string[] {
    // Run the git ls-tree command
	const workspacePath = UiUtilWrapper.workspaceFoldersFirstPath() || '.';
    const result = childProcess.execSync('git ls-tree -r --name-only HEAD', {
        cwd: workspacePath,
        encoding: 'utf-8'
    });

    // Split the result into lines
    const lines = result.split('\n');

    // Remove the last line if it is empty
    if (lines[lines.length - 1] === '') {
        lines.pop();
    }

    // Return the lines
	// Convert the lines to absolute paths
	if (withAbsolutePath) {
		const absolutePaths = lines.map(line => path.resolve(workspacePath, line));

		// Return the absolute paths
		return absolutePaths;
	} else {
		return lines;
	}
}

export async function getFileContent(fileName: string): Promise<string | undefined> {
	const readFile = util.promisify(fs.readFile);
	try {
		// Read file content from fileName
		const fileContent = await readFile(fileName, 'utf-8');
		// Return the whole text in the file with name fileName
		return fileContent;
	} catch (error) {
		logger.channel()!.error(`Error reading the file ${fileName}:`, error);
		return undefined;
	}
}