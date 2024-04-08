import * as vscode from 'vscode';

import { logger } from '../../util/logger';
import Debouncer from './debouncer';
import MemoryCacheManager from './cache';
import { createPrompt } from './promptCreator';
import { CodeCompleteResult, LLMStreamComplete } from './chunkFilter';
import { nvidiaStarcoderComplete } from './llm';
import { DevChatConfig } from '../../util/config';


export function registerCodeCompleteCallbackCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "DevChat.codecomplete_callback",
        async (callback: any) => {
            callback();
        }
    );

    context.subscriptions.push(disposable);
}

interface LogEventRequest {
    completion_id: string;
    type: string; // "view", "select"
    lines: number;
    length: number; // length of code completed
}

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private debouncer: Debouncer;
    private cache: MemoryCacheManager;

    constructor() {
        // TODO
        // Read delay time from config
        this.debouncer = new Debouncer(500);
        this.cache = new MemoryCacheManager();
    }

    async logEventToServer(event: LogEventRequest) {
        const devchatConfig = new DevChatConfig();
        const devchatToken = devchatConfig.get("providers.devchat.api_key");
        const devchatEndpoint = devchatConfig.get("providers.devchat.api_base");
        const apiUrl = `${devchatEndpoint}/complete_events`;
        const requestOptions: RequestInit = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${devchatToken}`,
            },
            body: JSON.stringify(event),
        };

        try {
            const response = await fetch(apiUrl, requestOptions);
            if (!response.ok) {
                logger.channel()?.info("log event to server failed:", response.status);
            }
        } catch (error) {
            console.error('Error posting event to the server:', error);
        }
    }

    async codeComplete(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<CodeCompleteResult | undefined> {
        // TODO
        // create prompt
        const fsPath = document.uri.fsPath;
        const fileContent = document.getText();
        const prompt = await createPrompt(fsPath, fileContent, position.line, position.character);

        // check cache
        const result = await this.cache.get(prompt);
        if (result) {
            return result;
        }

        // TODO
        // call code_completion
        const lines = fileContent.split('\n');
        let curlineIndent = lines[position.line].search(/\S/);
        if (curlineIndent === -1) {
            curlineIndent = 0;
        }
        const completor = new LLMStreamComplete(token, curlineIndent);
        const response = await completor.llmStreamComplete(prompt);
        if (!response || response.code.length === 0) {
            return undefined;
        }

        if (token.isCancellationRequested) {
            return undefined;
        }

        // cache result
        this.cache.set(prompt, response);
        return response;
    }

    async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | null> {
        const result = await this.debouncer.debounce();
        if (!result) {
            return [];
        }

        const response: CodeCompleteResult | undefined = await this.codeComplete(document, position, context, token);
        if (!response) {
            return [];
        }

        if (token.isCancellationRequested) {
            return [];
        }

        // TODO
        // 代码补全建议是否已经被用户看到，这个需要更加准确的方式来识别。
        logger.channel()?.info("code complete show.");
        this.logEventToServer(
            { 
                completion_id: response.id,
                type: "view",
                lines: response.code.split('\n').length,
                length: response.code.length
            });
        // log to server

        const logRejectionTimeout: NodeJS.Timeout = setTimeout(() => {
            logger.channel()?.info("code complete not accept.");
        }, 10_000);

        // 代码补全回调处理
        const callback = () => {
            logger.channel()?.info("accept:", response.id);
            // delete cache
            this.cache.delete(response.prompt);
            // delete timer
            clearTimeout(logRejectionTimeout);
            // log to server
            this.logEventToServer(
                { 
                    completion_id: response.id,
                    type: "select",
                    lines: response.code.split('\n').length,
                    length: response.code.length
                });
        };

        return [
            new vscode.InlineCompletionItem(
                response.code,
                new vscode.Range(
                    position,
                    position
                ),
                {
                    title: "code complete accept",
                    command: "DevChat.codecomplete_callback",
                    arguments: [callback],
                }
            ),
        ];
    }
}
