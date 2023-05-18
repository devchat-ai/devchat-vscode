import { spawn } from "child_process";
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { logger } from "../util/logger";

interface DtmResponse {
	status: number;
	message: string;
	log: string;
}

class DtmWrapper {
	private workspaceDir: string;
	private binaryPath: string;

	constructor() {
		this.workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.';
		this.binaryPath = 'dtm';

		let binaryName: string;
		switch (process.platform) {
		case 'win32':
			binaryName = 'dtm.exe';
			break;
		case 'darwin':
			binaryName = 'dtm';
			break;
		case 'linux':
			binaryName = 'dtm';
			break;
		default:
			vscode.window.showErrorMessage(`Unsupported platform: ${process.platform}`);
			return;
		}

		this.binaryPath = path.join(__dirname, '..', 'bin', process.platform, process.arch, binaryName);
		if (!fs.existsSync(this.binaryPath)) {
			logger.channel()?.error(`Binary not found: ${this.binaryPath}`);
			logger.channel()?.show();
		}
	}

	private async runCommand(command: string, args: string[]): Promise<DtmResponse> {
		return new Promise((resolve, reject) => {
			logger.channel()?.info(`Running command: ${command} ${args.join(' ')}`);
			const child = spawn(command, args, { cwd: this.workspaceDir });
			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data) => {
				stdout += data;
			});

			child.stderr.on('data', (data) => {
				stderr += data;
			});

			child.on('close', (code) => {
				try {
					const parsedOutput = JSON.parse(stdout.trim());
					if (code === 0) {
						resolve(parsedOutput);
					} else {
						reject(parsedOutput);
					}
				} catch (error) {
					// 处理 JSON 解析异常
					const errorObj = error as Error;
					reject({ status: -1, message: 'JSON parse error', log: errorObj.message });
				}
			});
		});
	}

	private async runCommand2(command: string, args: string[]): Promise<DtmResponse> {
		return new Promise((resolve, reject) => {
			logger.channel()?.info(`Running command: ${command} ${args.join(' ')}`);
			const child = spawn(command, args, { cwd: this.workspaceDir });
			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data) => {
				stdout += data;
			});

			child.stderr.on('data', (data) => {
				stderr += data;
			});

			child.on('close', (code) => {
				if (code === null) {
					code = 0;
				}
				resolve({ status: code, message: stdout, log: stderr });
			});
		});
	}

	async scaffold(directoryTree: string): Promise<DtmResponse> {
		return await this.runCommand(this.binaryPath, ['scaffold', directoryTree, '-o', 'json']);
	}

	async patch(patchFilePath: string): Promise<DtmResponse> {
		return await this.runCommand(this.binaryPath, ['patch', patchFilePath, '-o', 'json']);
	}

	async commit(commitMsg: string): Promise<DtmResponse> {
		try {
			return await this.runCommand(this.binaryPath, ['commit', '-m', commitMsg, '-o', 'json']);
		} catch (error) {
			// 处理 runCommand 中的 reject 错误
			logger.channel()?.error(`Error in commit: ${error}`);
			logger.channel()?.show();
			return error as DtmResponse;
		}
	}

	async commitall(commitMsg: string): Promise<DtmResponse> {
		try {
			logger.channel()?.info(`Running command: git commit -am ${commitMsg}`);
			return await this.runCommand2("git", ['commit', '-am', commitMsg]);
		} catch (error) {
			// 处理 runCommand 中的 reject 错误
			logger.channel()?.error(`Error in commit: ${error}`);
			logger.channel()?.show();
			return error as DtmResponse;
		}
	}
}

export default DtmWrapper;
