import axios, { AxiosResponse, CancelTokenSource } from "axios";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

import { logger } from "../util/logger";
import { getFileContent } from "../util/commonUtil";

import { UiUtilWrapper } from "../util/uiUtil";

function timeThis(
    target: Object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        const start = process.hrtime.bigint();
        const result = await originalMethod.apply(this, args);
        const end = process.hrtime.bigint();
        const nanoseconds = end - start;
        const seconds = Number(nanoseconds) / 1e9;

        const className = target.constructor.name;
        logger
            .channel()
            ?.debug(`Exec time [${className}.${propertyKey}]: ${seconds} s`);
        return result;
    };

    return descriptor;
}

export interface ChatRequest {
    content: string;
    model_name: string;
    api_key: string;
    api_base: string;
    parent?: string;
    context?: string[];
}

export interface ChatResponse {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "prompt-hash": string;
    user: string;
    date: string;
    response: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    finish_reason: string;
    isError: boolean;
    extra?: object;
}

export interface LogData {
    model: string;
    messages: object[];
    parent?: string;
    timestamp: number;
    request_tokens: number;
    response_tokens: number;
}

export interface LogInsertRes {
    hash?: string;
    error?: string;
}

export interface LogDeleteRes {
    success?: boolean;
    error?: string;
}

export interface ShortLog {
    hash: string;
    parent: string | null;
    user: string;
    date: string;
    request: string;
    responses: string[];
    context: Array<{
        content: string;
        role: string;
    }>;
}

export async function buildRoleContextsFromFiles(
    files: string[] | undefined
): Promise<object[]> {
    const contexts: object[] = [];
    if (!files) {
        return contexts;
    }

    for (const file of files) {
        const content = await getFileContent(file);

        if (!content) {
            continue;
        }
        contexts.push({
            role: "system",
            content: `<context>${content}</context>`,
        });
    }
    return contexts;
}

// TODO: 在插件启动为每个vscode窗口启动一个devchat local service
// 1. 分配单独的端口号，该窗口的所有请求都通过该端口号发送 (22222仅为作为开发默认端口号，不应用于生产)
// 2. 启动local service时要配置多个worker，以便处理并发请求
// TODO: 在插件关闭时，关闭其对应的devchat local service

export class DevChatClient {
    private baseURL: string;

    private _cancelMessageToken: CancelTokenSource | null = null;

    static readonly logRawDataSizeLimit = 10; //4 * 1024;

    // TODO: init devchat client with a port number
    // TODO: the default 22222 is for dev only, should not be used in production
    constructor(port: number = 22222) {
        this.baseURL = `http://localhost:${port}`;
    }

    async _get(path: string): Promise<AxiosResponse> {
        try {
            logger.channel()?.debug(`GET request to ${this.baseURL}${path}`);
            const response = await axios.get(`${this.baseURL}${path}`);
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    async _post(path: string, data: any = undefined): Promise<AxiosResponse> {
        try {
            const response = await axios.post(`${this.baseURL}${path}`, data);
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    @timeThis
    async getWorkflowList(): Promise<any> {
        const response = await this._get("/workflow/list");
        logger
            .channel()
            ?.debug(
                `getWorkflowList response data: \n${JSON.stringify(
                    response.data
                )}`
            );
        return response.data;
    }

    @timeThis
    async getWorkflowConfig(): Promise<any> {
        const response = await this._get("/workflow/config");
        logger
            .channel()
            ?.debug(
                `getWorkflowConfig response data: \n${JSON.stringify(
                    response.data
                )}`
            );
        return response.data;
    }

    @timeThis
    async updateWorkflows(): Promise<void> {
        const response = await this._post("/workflow/update");
        logger
            .channel()
            ?.debug(
                `updateWorkflows response data: \n${JSON.stringify(
                    response.data
                )}`
            );
    }

    @timeThis
    async message(
        message: ChatRequest,
        onData: (data: ChatResponse) => void
    ): Promise<ChatResponse> {
        this._cancelMessageToken = axios.CancelToken.source();
        const workspace = UiUtilWrapper.workspaceFoldersFirstPath();
        // const workspace = undefined;

        const data = {
            ...message,
            workspace: workspace,
        };

        return new Promise<ChatResponse>(async (resolve, reject) => {
            try {
                const response = await axios.post(
                    `${this.baseURL}/message/msg`,
                    data,
                    {
                        responseType: "stream",
                        cancelToken: this._cancelMessageToken!.token,
                    }
                );
                const chatRes: ChatResponse = {
                    "prompt-hash": "", // TODO: prompt-hash is not in chatting response
                    user: "",
                    date: "",
                    response: "",
                    finish_reason: "",
                    isError: false,
                };

                response.data.on("data", (chunk) => {
                    const chunkData = JSON.parse(chunk.toString());

                    if (chatRes.user === "") {
                        chatRes.user = chunkData["user"];
                    }
                    if (chatRes.date === "") {
                        chatRes.date = chunkData["date"];
                    }
                    chatRes.finish_reason = chunkData["finish_reason"];
                    if (chatRes.finish_reason === "should_run_workflow") {
                        chatRes.extra = chunkData["extra"];
                        logger
                            .channel()
                            ?.debug("should run workflow via cli.");
                        return;
                    }

                    chatRes.isError = chunkData["isError"];

                    chatRes.response += chunkData["content"];
                    onData(chatRes);
                });

                response.data.on("end", () => {
                    resolve(chatRes); // Resolve the promise with chatRes when the stream ends
                });

                response.data.on("error", (error) => {
                    logger.channel()?.error("Streaming error:", error);
                    // TODO: handle error
                    reject(error); // Reject the promise on error
                });
            } catch (error) {
                // TODO: handle error
                reject(error); // Reject the promise if the request fails
            }
        });
    }

    cancelMessage(): void {
        if (this._cancelMessageToken) {
            this._cancelMessageToken.cancel(
                "Message request cancelled by user"
            );
            this._cancelMessageToken = null;
        }
    }

    /**
     * Insert a message log.
     *
     * @param logData - The log data to be inserted.
     * @returns A tuple of inserted hash and error message.
     */
    @timeThis
    async insertLog(logData: LogData): Promise<LogInsertRes> {
        let body = {
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };

        const jsondata = JSON.stringify(logData);
        let filepath = "";

        if (jsondata.length <= DevChatClient.logRawDataSizeLimit) {
            // Use json data directly
            body["jsondata"] = jsondata;
            
        } else {
            // Write json data to a temp file
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, "devchat_log_insert.json");
            await fs.promises.writeFile(tempFile, jsondata);
            filepath = tempFile;
            body["filepath"] = filepath;
        }

        const response = await this._post("/logs/insert", body);
        logger
            .channel()
            ?.debug(
                `insertLog response data: ${JSON.stringify(
                    response.data
                )}, ${typeof response.data}}`
            );
        
        // Clean up temp file
        if (filepath) {
            try {
                await fs.promises.unlink(filepath);
            } catch (error) {
                logger.channel()?.error(`Failed to delete temp file ${filepath}: ${error}`);
            }
        }

        const res: LogInsertRes = {
            hash: response.data["hash"],
            error: response.data["error"],
        };
        return res;
    }

    @timeThis
    async deleteLog(logHash: string): Promise<LogDeleteRes> {
        const data = {
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
            hash: logHash,
        };
        const response = await this._post("/logs/delete", data);
        logger
            .channel()
            ?.debug(
                `deleteLog response data: ${JSON.stringify(
                    response.data
                )}, ${typeof response.data}}`
            );

        const res: LogDeleteRes = {
            success: response.data["success"],
            error: response.data["error"],
        };
        return res;
    }

    @timeThis
    async getTopicLogs(
        topicRootHash: string,
        limit: number,
        offset: number
    ): Promise<ShortLog[]> {
        const data = {
            limit: limit,
            offset: offset,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };
        const response = await axios.get(
            `${this.baseURL}/topics/${topicRootHash}/logs`,
            {
                params: data,
            }
        );

        const logs: ShortLog[] = response.data;
        logs.reverse();

        logger
            .channel()
            ?.debug(`getTopicLogs response data: ${JSON.stringify(logs)}`);

        return logs;
    }

    @timeThis
    async getTopics(limit: number, offset: number): Promise<any[]> {
        const data = {
            limit: limit,
            offset: offset,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };
        const response = await axios.get(`${this.baseURL}/topics`, {
            params: data,
        });

        const topics: any[] = response.data;
        topics.reverse();

        logger
            .channel()
            ?.debug(`getTopics response data: ${JSON.stringify(topics)}`);

        return topics;
    }

    @timeThis
    async deleteTopic(topicRootHash: string): Promise<void> {
        const data = {
            topic_hash: topicRootHash,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };

        const response = await this._post("/topics/delete", data);

        logger
            .channel()
            ?.debug(
                `deleteTopic response data: ${JSON.stringify(response.data)}`
            );

        return;
    }

    stopAllRequest(): void {
        this.cancelMessage();
        // add other requests here if needed
    }
}
