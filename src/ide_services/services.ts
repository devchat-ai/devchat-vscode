import * as http from 'http';
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';

import * as querystring from 'querystring';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';

import { createEnvByConda, createEnvByMamba } from '../util/python_installer/app_install';
import { installRequirements } from '../util/python_installer/package_install';

import {
	findDefinitions,
	findDefinitionsOfToken,
} from "./lsp_bridge/feature/find-defs";

import { findReferences } from "./lsp_bridge/feature/find-refs";
import { convertSymbolsToPlainObjects, executeProviderCommand } from './lsp/lsp';
import { applyCodeWithDiff } from '../handler/diffHandler';


const functionRegistry: any = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/get_lsp_brige_port": {
		"keys": [],
		"handler": async () => {
			logger.channel()?.info(`get lsp bridge port: ${process.env.DEVCHAT_IDE_SERVICE_PORT}`);
			// return await UiUtilWrapper.getLSPBrigePort();
			return process.env.DEVCHAT_IDE_SERVICE_PORT;
		}
	},
	"/visible_lines": {
		"keys": [],
		"handler": async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const visibleRanges = editor.visibleRanges;
				const visibleRange = visibleRanges[0];
				const visibleText = editor.document.getText(visibleRange);
				const filePath = editor.document.uri.fsPath;

				return {
					"filePath": filePath,
					"visibleText": visibleText,
					"visibleRange": [visibleRange.start.line, visibleRange.end.line]

				};
			} else {
				return {
					"filePath": "",
					"visibleText": "",
					"visibleRange": [-1, -1]
				};
			}
		}
	},
	"/selected_lines": {
		"keys": [],
		"handler": async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const selection = editor.selection;
				const selectedText = editor.document.getText(selection);
				const startLine = selection.start.line; // VS Code API uses 0-based indexing for lines
				const endLine = selection.end.line;
				const charCount = selectedText.length;
				const filePath = editor.document.uri.fsPath;

				return {
					"filePath": filePath,
					"selectedText": selectedText,
					"selectedRange": [startLine, selection.start.character, endLine, selection.end.character]

				};
			} else {
				return {
					"filePath": "",
					"selectedText": "",
					"selectedRange": [-1, -1, -1, -1]
				};
			}
		}
	},
	"/diff_apply": {
		"keys": ["filepath", "content"],
		"handler": async (filepath: string, content: string) => {
			applyCodeWithDiff({'fileName': filepath, 'content': content}, undefined );
			return true;
		}
	},
	"/definitions": {
		"keys": ["abspath", "line", "character", "token"],
		"handler": async (abspath: string, line: string | undefined = undefined, character: string | undefined = undefined, token: string | undefined = undefined) => {
			if (token !== undefined) {
				const definitions = await findDefinitionsOfToken(abspath, token);
				return definitions;
			} else {
				const definitions = await findDefinitions(abspath, Number(line), Number(character));
				return definitions;
			}
		}
	},
	"/references": {
		"keys": ["abspath", "line", "character"],
		"handler": async (abspath: string, line: number, character: number) => {
			const references = await findReferences(
				abspath,
				Number(line),
				Number(character)
			);

			return references;
		}
	},
	"/document_symbols": {
		"keys": ["abspath"],
		"handler": async (abspath: string) => {
			// A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.
			const documentSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | vscode.SymbolInformation[]>('vscode.executeDocumentSymbolProvider', vscode.Uri.file(abspath));
			if (!documentSymbols) {
				return [];
			}

			const symbols = convertSymbolsToPlainObjects(documentSymbols);
			return symbols;
		}
	},
	"/workspace_symbols": {
		"keys": ["query"],
		"handler": async (query: string) => {
			// A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.
			const querySymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>('vscode.executeWorkspaceSymbolProvider', query);
			if (!querySymbols) {
				return [];
			}

			return convertSymbolsToPlainObjects(querySymbols);
		}
	},
	"/find_definition": {
		"keys": ["abspath", "line", "col"],
		"handler": async (abspath: string, line: string, col: string) => {
			return await executeProviderCommand('vscode.executeDefinitionProvider', abspath, Number(line), Number(col));
		}
	},
	"/find_type_definition": {
		"keys": ["abspath", "line", "col"],
		"handler": async (abspath: string, line: string, col: string) => {
			return await executeProviderCommand('vscode.executeTypeDefinitionProvider', abspath, Number(line), Number(col));
		}
	},
	"/find_declaration": {
		"keys": ["abspath", "line", "col"],
		"handler": async (abspath: string, line: string, col: string) => {
			return await executeProviderCommand('vscode.executeDeclarationProvider', abspath, Number(line), Number(col));
		}
	},
	"/find_implementation": {
		"keys": ["abspath", "line", "col"],
		"handler": async (abspath: string, line: string, col: string) => {
			return await executeProviderCommand('vscode.executeImplementationProvider', abspath, Number(line), Number(col));
		}
	},
	"/find_reference": {
		"keys": ["abspath", "line", "col"],
		"handler": async (abspath: string, line: string, col: string) => {
			return await executeProviderCommand('vscode.executeReferenceProvider', abspath, Number(line), Number(col));
		}
	},
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
			const language = UiUtilWrapper.getConfiguration("DevChat", "Language");
			// 'en' stands for English, 'zh' stands for Simplified Chinese
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
				if (i > 1) {
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
		logger.channel()?.info(`request: ${parsedUrl}`)
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
		try {
			let responseResult = {};

			if (functionRegistry[parsedUrl.pathname]) {
				let keysExist = true;
				let newParameters: any[] = [];
				for (let key of functionRegistry[parsedUrl.pathname]['keys']) {
					if (!params.hasOwnProperty(key)) {
						// check whether key in functionRegistry[parsedUrl.pathname]['optional']
						newParameters.push(undefined);
						continue;
					}
					newParameters.push(params[key]);
				}
				if (!keysExist) {
					responseResult['error'] = "Missing required parameters";
				} else {
					responseResult['result'] = await functionRegistry[parsedUrl.pathname]['handler'](...newParameters);
					if (parsedUrl.pathname === "/definitions" || parsedUrl.pathname === "/references") {
						responseResult = responseResult['result'];
					}
				}
			} else {
				responseResult['error'] = "Function not found";
			}

			// eslint-disable-next-line @typescript-eslint/naming-convention
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(responseResult));
		} catch (error) {
			logger.channel()?.error(`Error: ${error}`);
			logger.channel()?.show();
		}
	}

	server.listen(0, () => {
		const address = server!.address();
		// `address()`返回的对象包含`port`属性，它是系统分配的端口号
		const port = typeof address === 'string' ? address : address?.port;
		logger.channel()?.info(`Server running at http://localhost:${port}/`);
		process.env.DEVCHAT_IDE_SERVICE_URL = `http://localhost:${port}`;
		process.env.DEVCHAT_IDE_SERVICE_PORT = `${port}`;
	});
}