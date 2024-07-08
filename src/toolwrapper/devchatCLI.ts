import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

import { logger } from "../util/logger";
import { CommandRun } from "../util/commonUtil";
import { UiUtilWrapper } from "../util/uiUtil";
import { ApiKeyManager } from "../util/apiKey";
import { assertValue } from "../util/check";
import { getFileContent } from "../util/commonUtil";
import { DevChatConfig } from "../util/config";

import { getMicromambaUrl } from "../util/python_installer/conda_url";

const readFileAsync = fs.promises.readFile;

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

export interface ChatOptions {
    parent?: string;
    reference?: string[];
    header?: string[];
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
}

export class DevChatCLI {
    private commandRun: CommandRun;

    constructor() {
        this.commandRun = new CommandRun();
    }

    private async buildArgs(options: ChatOptions): Promise<string[]> {
        let args = ["-m", "devchat", "route"];

        if (options.reference) {
            for (const reference of options.reference) {
                args.push("-r", reference);
            }
        }
        if (options.header) {
            for (const header of options.header) {
                args.push("-i", header);
            }
        }
        if (options.context) {
            for (const context of options.context) {
                args.push("-c", context);
            }
        }

        if (options.parent) {
            args.push("-p", options.parent);
        }

        const llmModelData = await ApiKeyManager.llmModel();
        assertValue(
            !llmModelData || !llmModelData.model,
            "You must select a LLM model to use for conversations"
        );
        args.push("-m", llmModelData.model);

        const functionCalling = DevChatConfig.getInstance().get(
            "enable_function_calling"
        );
        if (functionCalling) {
            args.push("-a");
        }

        return args;
    }

    private parseOutData(stdout: string, isPartial: boolean): ChatResponse {
        const responseLines = stdout.trim().split("\n");

        if (responseLines.length < 2) {
            return this.createChatResponse("", "", "", "", !isPartial);
        }
        // logger.channel()?.info(`\n-responseLines: ${responseLines}`);

        const [userLine, remainingLines1] = this.extractLine(
            responseLines,
            "User: "
        );
        const user = this.parseLine(userLine, /User: (.+)/);

        const [dateLine, remainingLines2] = this.extractLine(
            remainingLines1,
            "Date: "
        );
        const date = this.parseLine(dateLine, /Date: (.+)/);

        const [promptHashLine, remainingLines3] = this.extractLine(
            remainingLines2,
            "prompt"
        );
        const [finishReasonLine, remainingLines4] = this.extractLine(
            remainingLines3,
            "finish_reason:"
        );

        if (!promptHashLine) {
            return this.createChatResponse(
                "",
                user,
                date,
                remainingLines4.join("\n"),
                !isPartial
            );
        }

        const finishReason = finishReasonLine.split(" ")[1];
        const promptHash = promptHashLine.split(" ")[1];
        const response = remainingLines4.join("\n");

        return this.createChatResponse(
            promptHash,
            user,
            date,
            response,
            false,
            finishReason
        );
    }

    private extractLine(
        lines: string[],
        startWith: string
    ): [string, string[]] {
        const index = lines.findIndex((line) => line.startsWith(startWith));
        const extractedLine = index !== -1 ? lines.splice(index, 1)[0] : "";
        return [extractedLine, lines];
    }

    private parseLine(line: string, regex: RegExp): string {
        return line.match(regex)?.[1] ?? "";
    }

    private createChatResponse(
        promptHash: string,
        user: string,
        date: string,
        response: string,
        isError: boolean,
        finishReason = ""
    ): ChatResponse {
        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "prompt-hash": promptHash,
            user,
            date,
            response,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            finish_reason: finishReason,
            isError,
        };
    }

    public input(data: string) {
        this.commandRun?.write(data + "\n");
    }

    public stop() {
        this.commandRun.stop();
    }

    async runWorkflow(
        content: string,
        options: ChatOptions = {},
        onData: (data: ChatResponse) => void,
    ): Promise<ChatResponse> {
        // TODO: Use another cli command to run workflow instead of `devchat route`
        try {
            // build args for devchat prompt command
            const args = await this.buildArgs(options);
            args.push("--");
            args.push(content);

            // build env variables for prompt command
            const llmModelData = await ApiKeyManager.llmModel();
            assertValue(!llmModelData, "No valid llm model selected");
            const envs = {
                ...process.env,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                PYTHONUTF8: 1,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                command_python:
                    DevChatConfig.getInstance().get("python_for_commands") ||
                    "",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                PYTHONPATH:
                    UiUtilWrapper.extensionPath() + "/tools/site-packages",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                OPENAI_API_KEY: llmModelData.api_key.trim(),
                DEVCHAT_UNIT_TESTS_USE_USER_MODEL: 1,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                ...(llmModelData.api_base
                    ? {
                          OPENAI_API_BASE: llmModelData.api_base,
                          OPENAI_BASE_URL: llmModelData.api_base,
                      }
                    : {}),
                DEVCHAT_PROXY:
                    DevChatConfig.getInstance().get("DEVCHAT_PROXY") || "",
                MAMBA_BIN_PATH: getMicromambaUrl(),
            };

            // build process options
            const spawnAsyncOptions = {
                maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
                cwd: UiUtilWrapper.workspaceFoldersFirstPath(),
                env: envs,
            };

            logger
                .channel()
                ?.info(
                    `api_key: ${llmModelData.api_key.replace(
                        /^(.{4})(.*)(.{4})$/,
                        (_, first, middle, last) =>
                            first + middle.replace(/./g, "*") + last
                    )}`
                );
            logger.channel()?.info(`api_base: ${llmModelData.api_base}`);

            // run command
            //     handle stdout as steam mode
            let receviedStdout = "";
            const onStdoutPartial = (stdout: string) => {
                receviedStdout += stdout;
                const data = this.parseOutData(receviedStdout, true);
                onData(data);
            };
            // run command
            const pythonApp =
                DevChatConfig.getInstance().get("python_for_chat") || "python3";
            logger
                .channel()
                ?.info(`Running devchat:${pythonApp} ${args.join(" ")}`);
            const {
                exitCode: code,
                stdout,
                stderr,
            } = await this.commandRun.spawnAsync(
                pythonApp,
                args,
                spawnAsyncOptions,
                onStdoutPartial,
                undefined,
                undefined,
                undefined
            );
            //     handle result
            assertValue(code !== 0, stderr || "Command exited with error code");
            const responseData = this.parseOutData(stdout, false);
            //     return result
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "prompt-hash": "",
                user: "",
                date: "",
                response: responseData.response,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                finish_reason: "",
                isError: false,
            };
        } catch (error: any) {
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "prompt-hash": "",
                user: "",
                date: "",
                response: `Error: ${error.message}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                finish_reason: "error",
                isError: true,
            };
        }
    }
}

