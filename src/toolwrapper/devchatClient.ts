import axios, { AxiosResponse, CancelTokenSource } from "axios";

import { logger } from "../util/logger";
import { getFileContent } from "../util/commonUtil";
import {
    devchatSocket,
    startSocketConn,
    closeSocketConn,
} from "./socketClient";

import { UiUtilWrapper } from "../util/uiUtil";
import { workspace } from "vscode";
import { deleteTopic } from "@/handler/topicHandler";

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

export class DevChatClient {
    private baseURL: string;

    private _cancelMessageToken: CancelTokenSource | null = null;

    constructor() {
        // TODO: tmp dev
        this.baseURL = "http://localhost:22222";
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
                    // TODO: tmp string literal 临时字面量
                    if (chatRes.finish_reason === "should_run_workflow") {
                        chatRes.extra = chunkData["extra"];
                        logger
                            .channel()
                            ?.debug(
                                "res on data: should_run_workflow. do nothing now."
                            );
                        logger
                            .channel()
                            ?.debug(
                                `chatRes.extra: ${JSON.stringify(
                                    chatRes.extra
                                )}`
                            );
                        return;
                    }

                    chatRes.isError = chunkData["isError"];

                    chatRes.response += chunkData["content"];
                    logger.channel()?.debug(`${chunkData["content"]}`);
                    onData(chatRes);
                });

                response.data.on("end", () => {
                    logger.channel()?.debug("\nStreaming ended");
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
        // TODO: 处理当jsondata太大时，写入临时文件
        const data = {
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
            // workspace: undefined,
            jsondata: JSON.stringify(logData),
        };
        const response = await this._post("/logs/insert", data);
        logger
            .channel()
            ?.debug(
                `insertLog response data: ${JSON.stringify(
                    response.data
                )}, ${typeof response.data}}`
            );
        // TODO: handle error

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
    async getTopics(limit:number, offset:number): Promise<any[]> {
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
    async deleteTopic(topicRootHash:string): Promise<void> {
        const data = {
            topic_hash: topicRootHash,
            workspace: UiUtilWrapper.workspaceFoldersFirstPath(),
        };
        
        const response = await this._post("/topics/delete", data);

        logger
            .channel()
            ?.debug(`deleteTopic response data: ${JSON.stringify(response.data)}`);

        return;
    }

    stopAllRequest(): void {
        this.cancelMessage();
        // add other requests here if needed
    }
    }
