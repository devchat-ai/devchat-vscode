import axios, { AxiosResponse, CancelTokenSource } from "axios";

import { logger } from "../util/logger";
import { getFileContent } from "../util/commonUtil";
import { devchatSocket, startSocketConn, closeSocketConn } from "./socketClient";
import { on } from "events";

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
    parent?: string;
    context?: string[];
}

interface ChatResponse {
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
    async _post(path: string, data: any): Promise<AxiosResponse> {
        try {
            const response = await axios.post(`${this.baseURL}${path}`, data);
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    @timeThis
    async getWorkflowList(): Promise<void> {
        const response = await this._get("/workflow/list");
        logger
            .channel()
            ?.info(
                `getWorkflowList response data: \n${JSON.stringify(
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

        return new Promise<ChatResponse>(async (resolve, reject) => {
            try {
                const response = await axios.post(
                    `${this.baseURL}/message/msg`,
                    message,
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
                        logger.channel()?.debug("res on data: should_run_workflow. do nothing now.");
                        logger.channel()?.debug(`chatRes.extra: ${JSON.stringify(chatRes.extra)}`);
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

    @timeThis
    async workflow(
        // onData: (data: ChatResponse) => void
        userS: string,
        dateS: string,
        workflowName: string,
        workflowInput: string,
        onData: (data: ChatResponse) => void,
    ): Promise<ChatResponse> {
        return new Promise<ChatResponse>(async (resolve, reject) => {
            try {
                if (!devchatSocket) {
                    startSocketConn();
                }

                const workflowRes: ChatResponse = {
                    "prompt-hash": "", // TODO: prompt-hash is not in chatting response
                    user: userS,
                    date: dateS,
                    response: "",
                    finish_reason: "",
                    isError: false,
                };

                devchatSocket?.emit("start_workflow", {
                    workflow_name: workflowName,
                    workflow_input: workflowInput,
                });

                devchatSocket?.on("workflow_output", (data) => {
                    logger
                        .channel()
                        ?.debug(`@@@@@ Received workflow OUTPUT:\n${data}`);
                    // onData(data);
                    workflowRes.response += data;
                    onData(workflowRes);
                });

                devchatSocket?.on("workflow_finish", (data) => {
                    logger
                        .channel()
                        ?.debug(`Received workflow finish:\n${data}`);
                    closeSocketConn();
                    resolve(workflowRes);
                });

            } catch (error) {
                // TODO: handle error
                reject(error); // Reject the promise if the request fails
            }
        });
    }

    async sendWorkflowProcessInput(data: object): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (!devchatSocket) {
                    // TODO: start or reject?
                    // startSocketConn();
                    logger.channel()?.error("Socket connection is not established.");
                    reject("Socket connection is not established.");
                }
                logger.channel()?.info(`sendWorkflowProcessInput data: ${JSON.stringify(data)}`);
                devchatSocket?.emit("workflow_process_input", data);
                logger.channel()?.info("sendWorkflowProcessInput emitted.");
                resolve();
            } catch (error) {
                console.error(error);
                // throw error;
                // TODO: handle error
                reject(error);
            }
        });
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
            jsondata: JSON.stringify(logData),
        };
        const response = await this._post("/log/insert", data);
        const resData = JSON.stringify(response.data);
        logger
            .channel()
            ?.info(
                `insertLog response data: \n${response.data["hash"]}\n${response.data["error"]}`
            );
        // TODO: handle error

        return {
            hash: response.data["hash"],
            error: response.data["error"],
        };
    }

    // TODO: tmp stop
    stopAllRequest(): void {
        this.cancelMessage();
    }

    async sSample(): Promise<void> {
        try {
            const response = await axios.get(
                `${this.baseURL}/message/ssample`,
                { responseType: "stream" }
            );
            response.data.on("data", (chunk) => {
                logger.channel()?.info(typeof chunk);
                logger.channel()?.info(chunk.toString());
            });
            response.data.on("end", () => {
                logger.channel()?.info("\nStreaming ended");
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
