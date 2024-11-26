import axios, { AxiosResponse, CancelTokenSource } from "axios";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

import { logger } from "../util/logger";
import { getFileContent } from "../util/commonUtil";

import { UiUtilWrapper } from "../util/uiUtil";


class DCLocalServicePortNotSetError extends Error {
    constructor() {
        super("DC_LOCALSERVICE_PORT is not set");
        this.name = "DCLocalServicePortNotSetError";
    }
}

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

function catchAndReturn(defaultReturn: any) {
    return function (
        target: Object,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<any>
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                if (error instanceof DCLocalServicePortNotSetError) {
                    logger.channel()?.warn(`DC_LOCALSERVICE_PORT is not set in [${propertyKey}]`);
                    return defaultReturn;
                }
                
                logger.channel()?.error(`Error in [${propertyKey}]: ${error}`);
                return defaultReturn;
            }
        };

        return descriptor;
    };
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
}

export interface LogDeleteRes {
    success?: boolean;
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

export class DevChatClient {
    private baseURL: string | undefined;

    private _cancelMessageToken: CancelTokenSource | null = null;

    static readonly logRawDataSizeLimit = 4 * 1024;

    constructor() {
    }

    async _get(path: string, config?: any): Promise<AxiosResponse> {
        if (!this.baseURL) {
            if (!process.env.DC_LOCALSERVICE_PORT) {
                logger.channel()?.info("No local service port found.");
                throw new DCLocalServicePortNotSetError();
            }
            logger.channel()?.trace("Using local service port:", process.env.DC_LOCALSERVICE_PORT);
            const port: number = parseInt(process.env.DC_LOCALSERVICE_PORT || '8008', 10);
            this.baseURL = `http://localhost:${port}`;
        }

        try {
            logger.channel()?.debug(`GET request to ${this.baseURL}${path}`);
            const response = await axios.get(`${this.baseURL}${path}`, config);
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    async _post(path: string, data: any = undefined): Promise<AxiosResponse> {
        if (!this.baseURL) {
            if (!process.env.DC_LOCALSERVICE_PORT) {
                logger.channel()?.info("No local service port found.");
                throw new DCLocalServicePortNotSetError();
            }
            logger.channel()?.trace("Using local service port:", process.env.DC_LOCALSERVICE_PORT);
            const port: number = parseInt(process.env.DC_LOCALSERVICE_PORT || '8008', 10);
            this.baseURL = `http://localhost:${port}`;
        }

        try {
            logger.channel()?.debug(`POST request to ${this.baseURL}${path}`);
            const response = await axios.post(`${this.baseURL}${path}`, data);
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    @timeThis
    @catchAndReturn([])
    async getWorkflowList(): Promise<any[]> {
        const response = await this._get("/workflows/list");
        logger
            .channel()
            ?.trace(
                `getWorkflowList response data: \n${JSON.stringify(
                    response.data
                )}`
            );
        return response.data;
    }

    @timeThis
    @catchAndReturn({})
    async getWorkflowConfig(): Promise<any> {
        const response = await this._get("/workflows/config");
        logger
            .channel()
            ?.trace(
                `getWorkflowConfig response data: \n${JSON.stringify(
                    response.data
                )}`
            );
        return response.data;
    }

    @timeThis
    @catchAndReturn(undefined)
    async updateWorkflows(): Promise<void> {
        const response = await this._post("/workflows/update");
        logger
            .channel()
            ?.trace(
                `updateWorkflows response data: \n${JSON.stringify(
                    response.data
                )}`
            );
    }

    @timeThis
    @catchAndReturn(undefined)
    async updateCustomWorkflows(): Promise<void> {
        const response = await this._post("/workflows/custom_update");
        logger
            .channel()
            ?.trace(
                `updateCustomWorkflows response data: \n${JSON.stringify(
                    response.data
                )}`
            );
    }

    @timeThis
    async message(
        message: ChatRequest,
        onData: (data: ChatResponse) => void
    ): Promise<ChatResponse> {
        if (!this.baseURL) {
            if (!process.env.DC_LOCALSERVICE_PORT) {
                logger.channel()?.info("No local service port found.");
            }
            logger.channel()?.trace("Using local service port:", process.env.DC_LOCALSERVICE_PORT);
            const port: number = parseInt(process.env.DC_LOCALSERVICE_PORT || '8008', 10);
            this.baseURL = `http://localhost:${port}`;
        }

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
                    "prompt-hash": "", // prompt-hash is not in chatting response, it is created in the later insertLog()
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
                        logger.channel()?.debug("should run workflow via cli.");
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
                    chatRes.isError = true;
                    chatRes.response += `\n${error}`;
                    resolve(chatRes); // handle error by resolving the promise 
                });
            } catch (error) {
                const errorRes: ChatResponse = {
                    "prompt-hash": "",
                    user: "",
                    date: "",
                    response: `${error}`,
                    finish_reason: "",
                    isError: true,
                };
                resolve(errorRes); // handle error by resolving the promise using an errorRes
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
    @catchAndReturn({ hash: "" })
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
            ?.trace(
                `insertLog response data: ${JSON.stringify(
                    response.data
                )}, ${typeof response.data}}`
            );

        // Clean up temp file
        if (filepath) {
            try {
                await fs.promises.unlink(filepath);
            } catch (error) {
                logger
                    .channel()
                    ?.error(`Failed to delete temp file ${filepath}: ${error}`);
            }
        }

        const res: LogInsertRes = {
            hash: response.data["hash"],
        };
        return res;
    }

    @timeThis
    @catchAndReturn({ success: false })
    async deleteLog(logHash: string): Promise<LogDeleteRes> {
        const data = {
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
            hash: logHash,
        };
        const response = await this._post("/logs/delete", data);
        logger
            .channel()
            ?.trace(
                `deleteLog response data: ${JSON.stringify(
                    response.data
                )}, ${typeof response.data}}`
            );

        const res: LogDeleteRes = {
            success: response.data["success"],
        };
        return res;
    }

    @timeThis
    @catchAndReturn([])
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
        const response = await this._get(`/topics/${topicRootHash}/logs`, {
            params: data,
        });

        const logs: ShortLog[] = response.data;
        logs.reverse();

        logger
            .channel()
            ?.trace(`getTopicLogs response data: ${JSON.stringify(logs)}`);

        return logs;
    }

    @timeThis
    @catchAndReturn([])
    async getTopics(limit: number, offset: number): Promise<any[]> {
        const data = {
            limit: limit,
            offset: offset,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };
        const response = await this._get(`/topics`, {
            params: data,
        });

        const topics: any[] = response.data;
        topics.reverse();

        logger
            .channel()
            ?.trace(`getTopics response data: ${JSON.stringify(topics)}`);

        return topics;
    }

    @timeThis
    @catchAndReturn(undefined)
    async deleteTopic(topicRootHash: string): Promise<void> {
        const data = {
            topic_hash: topicRootHash,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };

        const response = await this._post("/topics/delete", data);

        logger
            .channel()
            ?.trace(
                `deleteTopic response data: ${JSON.stringify(response.data)}`
            );

        return;
    }

    stopAllRequest(): void {
        this.cancelMessage();
        // add other requests here if needed
    }
}