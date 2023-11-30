import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';


const functionRegistry: any = {
	"/hellox": {
		"keys": [],
		"handler": async () => {
			return "111222";
		}
	},
	"/hellox2": {
		"keys": ["a", "b"],
		"handler": async (a: string, b: string) => {
			return a+b;
		}
	},
	"/hellox3": {
		"keys": [],
		"handler": async () => {
			return {
				"name": "v1",
				"age": 20,
				"others": {
					"address": "sh",
					"phone": "123456789"
				}
			};
		}
	},
	"/get_lsp_brige_port": {
		"keys": [],
		"handler": async () => {
			return await UiUtilWrapper.getLSPBrigePort();
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