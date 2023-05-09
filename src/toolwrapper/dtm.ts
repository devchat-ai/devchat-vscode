import { spawn } from "child_process";
import * as vscode from 'vscode';

import { logger } from "../util/logger";

interface DtmResponse {
	status: number;
	message: string;
	log: string;
}

class DtmWrapper {
	private workspaceDir: string;

	constructor() {
		this.workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.';
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

	async scaffold(directoryTree: string): Promise<DtmResponse> {
		return await this.runCommand('dtm', ['scaffold', directoryTree, '-o', 'json']);
	}

	async patch(patchFilePath: string): Promise<DtmResponse> {
		return await this.runCommand('dtm', ['patch', patchFilePath, '-o', 'json']);
	}

	async commit(commitMsg: string): Promise<DtmResponse> {
		try {
			return await this.runCommand('dtm', ['commit', '-m', commitMsg, '-o', 'json']);
		} catch (error) {
			// 处理 runCommand 中的 reject 错误
			logger.channel()?.error(`Error in commit: ${error}`);
			logger.channel()?.show();
			return error as DtmResponse;
		}
	}
}

export default DtmWrapper;
