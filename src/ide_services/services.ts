/* eslint-disable @typescript-eslint/naming-convention */
import * as http from "http";
import * as querystring from "querystring";
import { logger } from "../util/logger";

import { getServicePort } from "./endpoints/getServicePort";
import { installPythonEnv } from "./endpoints/installPythonEnv";
import { ideLogging} from "./endpoints/ideLogging";
import { updateSlashCommands } from "./endpoints/updateSlashCommands";
import { ideLanguage } from "./endpoints/ideLanguage";
import { LegacyEndpoints } from "./endpoints/legacy";
import { UnofficialEndpoints } from "./endpoints/unofficial";
import { getDocumentSymbols } from "./endpoints/getDocumentSymbols";
import { findTypeDefinitionLocations } from "./endpoints/findTypeDefs";
import { findDefinitionLocations } from "./endpoints/findDefs";
import { getCurrentFileInfo } from "./endpoints/getCurrentFileInfo";

const functionRegistry: any = {
    /**
     * Official IDE Service Protocol Endpoints
     */
    "/get_lsp_brige_port": {
        keys: [],
        handler: getServicePort,
    },
    "/install_python_env": {
        keys: ["command_name", "requirements_file"],
        handler: installPythonEnv,
    },
    "/update_slash_commands": {
        keys: [],
        handler: updateSlashCommands,
    },
    "/ide_language": {
        keys: [],
        handler: ideLanguage,
    },
    "/ide_logging": {
        keys: ["level", "message"],
        handler: ideLogging,
    },
    "/get_document_symbols": {
        keys: ["abspath"],
        handler: getDocumentSymbols,
    },
    "/find_def_locations": {
        keys: ["abspath", "line", "character"],
        handler: findDefinitionLocations,
    },
    "/find_type_def_locations": {
        keys: ["abspath", "line", "character"],
        handler: findTypeDefinitionLocations,
    },
    "/ide_name": {
        keys: [],
        handler: () => "vscode",
    },
    "/diff_apply": {
        keys: ["filepath", "content"],
        handler: UnofficialEndpoints.diffApply,
    },

    /**
     * @deprecated
     */
    "/definitions": {
        keys: ["abspath", "line", "character", "token"],
        handler: LegacyEndpoints.definitions,
    },
    /**
     * @deprecated
     */
    "/references": {
        keys: ["abspath", "line", "character"],
        handler: LegacyEndpoints.references,
    },

    /**
     * Unofficial endpoints
     */
    "/get_symbol_defines_in_selected_code": {
        keys: [],
        handler: UnofficialEndpoints.getSymbolDefinesInSelectedCode,
    },
	"/run_code": {
		keys: ["code"],
		handler: UnofficialEndpoints.runCode,
	},
    "/current_file_info": {
        keys: [],
        handler: getCurrentFileInfo,
    }
};

let server: http.Server | null = null;
export async function startRpcServer() {
    server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
        logger.channel()?.trace(`request: ${parsedUrl}`);

        // 添加 CORS 头
        res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有源，或者指定一个具体的源
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // 允许的 HTTP 方法
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // 允许的请求头

        if (parsedUrl.pathname === "/favicon.ico") {
            res.writeHead(204);
            res.end();
            return;
        }

        let params: any = {};

        if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString(); // 将Buffer转换为string
            });

            req.on("end", () => {
                // 根据不同Content-Type，进行不同方式的解析
                if (req.headers["content-type"] === "application/json") {
                    // 解析JSON格式的数据
                    params = JSON.parse(body);

                    // 处理postParams
                } else if (
                    req.headers["content-type"] ===
                    "application/x-www-form-urlencoded"
                ) {
                    // 解析URL编码的数据
                    params = querystring.parse(body);
                    // 处理postParams
                }

                handleRequest(parsedUrl, params, res);
            });
        } else if (req.method === "GET") {
            const queryParams = parsedUrl.searchParams;
            for (let param of queryParams) {
                params[param[0]] = param[1];
            }

            handleRequest(parsedUrl, params, res);
        }
    });

    async function handleRequest(
        parsedUrl: URL,
        params: any,
        res: http.ServerResponse
    ) {
        try {
            let responseResult = {};

            if (functionRegistry[parsedUrl.pathname]) {
                let keysExist = true;
                let newParameters: any[] = [];
                for (let key of functionRegistry[parsedUrl.pathname]["keys"]) {
                    if (!params.hasOwnProperty(key)) {
                        // check whether key in functionRegistry[parsedUrl.pathname]['optional']
                        newParameters.push(undefined);
                        continue;
                    }
                    newParameters.push(params[key]);
                }
                if (!keysExist) {
                    responseResult["error"] = "Missing required parameters";
                } else {
					const res = await functionRegistry[
                        parsedUrl.pathname
                    ]["handler"](...newParameters);
					try {
						if (parsedUrl.pathname === "/run_code") {
							responseResult["result"] = structuredClone(res);
						} else {
							responseResult["result"] = res;
						}
					} catch (error) {
						logger.channel()?.debug(`warning: ${error}`);
						responseResult["result"] = res;
					}
                    
                    if (
                        parsedUrl.pathname === "/definitions" ||
                        parsedUrl.pathname === "/references"
                    ) {
                        responseResult = responseResult["result"];
                    }
                }
            } else {
                responseResult["error"] = "Function not found";
            }

            // eslint-disable-next-line @typescript-eslint/naming-convention
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(responseResult));
        } catch (error) {
            logger.channel()?.error(`Error: ${error}`);
            logger.channel()?.show();

			let responseResult = {"error": `Error: ${error}`};
			res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(responseResult));
        }
    }

    server.listen(0, () => {
        const address = server!.address();
        // `address()`返回的对象包含`port`属性，它是系统分配的端口号
        const port = typeof address === "string" ? address : address?.port;
        logger.channel()?.info(`Server running at http://localhost:${port}/`);
        process.env.DEVCHAT_IDE_SERVICE_URL = `http://localhost:${port}`;
        process.env.DEVCHAT_IDE_SERVICE_PORT = `${port}`;
    });
}
