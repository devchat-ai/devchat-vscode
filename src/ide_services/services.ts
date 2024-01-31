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
import { getSymbolDefines } from '../context/contextRefDefs';
import { UnofficialEndpoints } from './endpoints/unofficial';
import { getServicePort } from './endpoints/getServicePort';
import { installPythonEnv } from './endpoints/installPythonEnv';
import { logError, logInfo, logWarn } from './endpoints/ideLogging';
import { updateSlashCommands } from './endpoints/updateSlashCommands';
import { ideLanguage } from './endpoints/ideLanguage';


const functionRegistry: any = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/get_lsp_brige_port": {
		"keys": [],
		"handler": getServicePort
	},
	"/visible_lines": {
		"keys": [],
		"handler": UnofficialEndpoints.visibleLines
	},
	"/selected_lines": {
		"keys": [],
		"handler": UnofficialEndpoints.selectedLines
	},
	"/diff_apply": {
		"keys": ["filepath", "content"],
		"handler": UnofficialEndpoints.diffApply
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
		"handler": UnofficialEndpoints.documentSymbols
	},
	"/workspace_symbols": {
		"keys": ["query"],
		"handler": UnofficialEndpoints.workspaceSymbols
	},
	"/find_definition": {
		"keys": ["abspath", "line", "col"],
		"handler": UnofficialEndpoints.findDefinition
	},
	"/find_type_definition": {
		"keys": ["abspath", "line", "col"],
		"handler": UnofficialEndpoints.findTypeDefinition
	},
	"/find_declaration": {
		"keys": ["abspath", "line", "col"],
		"handler": UnofficialEndpoints.findTypeDefinition
	},
	"/find_implementation": {
		"keys": ["abspath", "line", "col"],
		"handler": UnofficialEndpoints.findImplementation
	},
	"/find_reference": {
		"keys": ["abspath", "line", "col"],
		"handler": UnofficialEndpoints.findReference
	},
	"/update_slash_commands": {
		"keys": [],
		"handler": updateSlashCommands
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/ide_language": {
		"keys": [],
		"handler": ideLanguage
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_info": {
		"keys": ["message"],
		"handler": logInfo
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_warn": {
		"keys": ["message"],
		"handler": logWarn
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/log_error": {
		"keys": ["message"],
		"handler": logError
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/open_folder": {
		"keys": ["folder"],
		"handler": UnofficialEndpoints.openFolder
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/install_python_env": {
		"keys": ["command_name", "requirements_file"],
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"handler": installPythonEnv
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"/get_symbol_defines_in_selected_code": {
		"keys": [],
		"handler": UnofficialEndpoints.getSymbolDefinesInSelectedCode
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