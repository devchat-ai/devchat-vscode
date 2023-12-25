import * as http from 'http';
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';

import * as querystring from 'querystring';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';

import { createEnvByConda, createEnvByMamba } from '../util/python_installer/app_install';
import { installRequirements } from '../util/python_installer/package_install';




const functionRegistry: any = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/get_lsp_brige_port": {
		"keys": [],
		"handler": async () => {
			return await UiUtilWrapper.getLSPBrigePort();
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/update_slash_commands": {
		"keys": [],
		"handler": async () => {
			vscode.commands.executeCommand('DevChat.InstallCommands');
			return true;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/ide_language": {
		"keys": [],
		"handler": async () => {
			const language = vscode.env.language;
			// 'en' stands for English, 'zh-cn' stands for Simplified Chinese
			return language;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_info": {
		"keys": ["message"],
		"handler": async (message: string) => {
			logger.channel()?.info(message);
			return true;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_warn": {
		"keys": ["message"],
		"handler": async (message: string) => {
			logger.channel()?.warn(message);
			return true;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_error": {
		"keys": ["message"],
		"handler": async (message: string) => {
			logger.channel()?.error(message);
			return true;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/open_folder": {
		"keys": ["folder"],
		"handler": async (folder: string) => {
			// open folder by vscode
			const folderPathParsed = folder.replace('\\', '/');
			// Updated Uri.parse to Uri.file
			const folderUri = vscode.Uri.file(folderPathParsed);
			vscode.commands.executeCommand(`vscode.openFolder`, folderUri);
			return true;
		}
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/install_python_env": {
		"keys": ["command_name", "requirements_file"],
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"handler": async (command_name: string, requirements_file: string) => {
			// 1. install python >= 3.11
			logger.channel()?.info(`create env for python ...`);
			logger.channel()?.info(`try to create env by mamba ...`);
			let pythonCommand = await createEnvByMamba(command_name, "", "3.11.4");

			if (!pythonCommand || pythonCommand === "") {
				logger.channel()?.info(`create env by mamba failed, try to create env by conda ...`);
				pythonCommand = await createEnvByConda(command_name, "", "3.11.4");
			}

			if (!pythonCommand || pythonCommand === "") {
				logger.channel()?.error(`create virtual python env failed, you need create it by yourself with command: "conda create -n devchat-commands python=3.11.4"`);
				logger.channel()?.show();

				return "";
			}

			// 3. install requirements.txt
			// run command: pip install -r {requirementsFile}
			let isInstalled = false;
			// try 3 times
			for (let i = 0; i < 4; i++) {
				let otherSource: string | undefined = undefined;
				if (i>1) {
					otherSource = 'https://pypi.tuna.tsinghua.edu.cn/simple/';
				}
				isInstalled = await installRequirements(pythonCommand, requirements_file, otherSource);
				if (isInstalled) {
					break;
				}
				logger.channel()?.info(`Install packages failed, try again: ${i + 1}`);
			}
			if (!isInstalled) {
				logger.channel()?.error(`Install packages failed, you can install it with command: "${pythonCommand} -m pip install -r ${requirements_file}"`);
				logger.channel()?.show();
				return '';
			}
			
			return pythonCommand.trim();
		}
	}
};



let server: http.Server | null = null;
export async function startRpcServer() {
	server = http.createServer((req, res) => {
		const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
		if (parsedUrl.pathname === '/favicon.ico') {
			res.writeHead(204);
			res.end();
			return;
		}

		let params: any = {};

		if (req.method === 'POST') {
			let body = '';
			req.on('data', chunk => {
				body += chunk.toString(); // 将Buffer转换为string
			});

			req.on('end', () => {
				// 根据不同Content-Type，进行不同方式的解析
				if (req.headers['content-type'] === 'application/json') {
					// 解析JSON格式的数据
					params = JSON.parse(body);

					// 处理postParams
				} else if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
					// 解析URL编码的数据
					params = querystring.parse(body);
					// 处理postParams
				}

				handleRequest(parsedUrl, params, res);
			});
		} else if (req.method === 'GET') {
			const queryParams = parsedUrl.searchParams;
			for (let param of queryParams) {
				params[param[0]] = param[1];
			}

			handleRequest(parsedUrl, params, res);
		}
	});

	async function handleRequest(parsedUrl: URL, params: any, res: http.ServerResponse) {
		let responseResult = {};
	
		if (functionRegistry[parsedUrl.pathname]) {
			let keysExist = true;
			let newParameters: any[] = [];
			for (let key of functionRegistry[parsedUrl.pathname]['keys']) {
				if (!params.hasOwnProperty(key)) {
					keysExist = false;
					break;
				}
				newParameters.push(params[key]);
			}
			if (!keysExist) {
				responseResult['error'] = "Missing required parameters";
			} else {
				responseResult['result'] = await functionRegistry[parsedUrl.pathname]['handler'](...newParameters);
			}
		} else {
			responseResult['error'] = "Function not found";
		}
	
		// eslint-disable-next-line @typescript-eslint/naming-convention
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(responseResult));
	}
	
	server.listen(0, () => {
		const address = server!.address();
        // `address()`返回的对象包含`port`属性，它是系统分配的端口号
        const port = typeof address === 'string' ? address : address?.port;
        logger.channel()?.info(`Server running at http://localhost:${port}/`);
		process.env.DEVCHAT_IDE_SERVICE_URL = `http://localhost:${port}`;
	});
}