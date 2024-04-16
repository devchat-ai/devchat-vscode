import * as vscode from 'vscode';

import { logger } from '../../util/logger';
import Debouncer from './debouncer';
import MemoryCacheManager from './cache';
import { createPrompt, findSimilarCodeBlock } from './promptCreator';
import { CodeCompleteResult, LLMStreamComplete } from './chunkFilter';
import { DevChatConfig } from '../../util/config';
import { outputAst } from './astTest';
import { getEndOfLine } from './ast/language';
import { RecentEditsManager } from './recentEdits';
import { GitDiffWatcher } from './gitDiffWatcher';

export function registerCodeCompleteCallbackCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "DevChat.codecomplete_callback",
        async (callback: any) => {
            callback();
        }
    );

    context.subscriptions.push(disposable);
}

function isSubsequence(sub: string, source: string): boolean {
    let subIndex = 0; // 子序列字符串的索引
    let srcIndex = 0; // 源字符串的索引
  
    // 当子序列和源字符串索引都未超出自身长度时循环
    while (subIndex < sub.length && srcIndex < source.length) {
      // 如果找到一个匹配的字符，则移动子序列的索引
      if (sub[subIndex] === source[srcIndex]) {
        subIndex++;
      }
      // 无论是否找到匹配，源字符串索引始终移动
      srcIndex++;
    }
  
    // 如果子序列索引等于子序列长度，说明子序列的所有字符都按顺序在源字符串中找到了
    return subIndex === sub.length;
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
    private devchatConfig: DevChatConfig;
    private lastComplete: string;
    private recentEditors: RecentEditsManager;
    private previousCodeComplete: CodeCompleteResult | undefined;
    private previousPrefix: string | undefined;

    constructor() {
        // TODO
        // Read delay time from config
        this.debouncer = new Debouncer(500);
        this.cache = new MemoryCacheManager();
        this.devchatConfig = DevChatConfig.getInstance();
        this.lastComplete = "";
        this.recentEditors = new RecentEditsManager();
    }

    async logEventToServer(event: LogEventRequest) {
        const devchatToken = this.devchatConfig.get("providers.devchat.api_key");
        const devchatEndpoint = this.devchatConfig.get("providers.devchat.api_base");
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
                if (this.devchatConfig.get("complete_debug")) {
                    logger.channel()?.info("log event to server failed:", response.status);
                }
            }
        } catch (error) {
            console.error('Error posting event to the server:', error);
        }
    }

    // check whether need to send code complete event
    // async shouldSendCodeCompleteEvent(document: vscode.TextDocument, position: vscode.Position): Promise< boolean > {
    //     // if complete_enable is false, then don't send code complete
    //     if (!this.devchatConfig.get("complete_enable")) {
    //         return false;
    //     }

    //     // if A|B, then don't send code complete
    //     const preChar = document.getText(new vscode.Range(position.line, position.character - 1, position.line, position.character));
    //     const postChar = document.getText(new vscode.Range(position.line, position.character, position.line, position.character + 1));
    //     if (preChar !== ' ' && postChar !== ' ') {
    //         return false;
    //     }

    //     const fsPath = document.uri.fsPath;
    //     const fileContent = document.getText();
    //     const lines = fileContent.split('\n');

    //     // don't complete while stmt is end
    //     const langEndofLine: string[] = await getEndOfLine(fsPath);
    //     for (const endOfLine of langEndofLine) {
    //         if (lines[position.line].endsWith(endOfLine) && position.character >= lines[position.line].length) {
    //             return false;
    //         }
    //     }

    //     return true;
    // }

    async codeComplete(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<CodeCompleteResult | undefined> {
        GitDiffWatcher.getInstance().tryRun();
        const completeDebug = this.devchatConfig.get("complete_debug");

        // create prompt
        const fsPath = document.uri.fsPath;
        const fileContent = document.getText();
        const posOffset = document.offsetAt(position);

        if (completeDebug) {
            logger.channel()?.info(`cur position: ${position.line}: ${position.character}`);
        }

        const prompt = await createPrompt(fsPath, fileContent, position.line, position.character, posOffset, this.recentEditors.getEdits());
        if (!prompt) {
            return undefined;
        }
        if (completeDebug) {
            logger.channel()?.info("prompt:", prompt);
        }

        // check cache
        const result = await this.cache.get(prompt);
        if (result) {
            if (completeDebug) {
                logger.channel()?.info(`cache hited:\n${result.code}`);
            }
            return result;
        }

        const lines = fileContent.split('\n');
        const langEndofLine: string[] = await getEndOfLine(fsPath);
        for (const endOfLine of langEndofLine) {
            if (lines[position.line].endsWith(endOfLine) && position.character >= lines[position.line].length) {
                return undefined;
            }
        }
        if (this.lastComplete.endsWith(lines[position.line]) && this.lastComplete !== "" && lines[position.line].trim() !== "") {
            return undefined;
        }

        const completor = new LLMStreamComplete(token, lines, position.line, position.character);
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
        const completeDebug = this.devchatConfig.get("complete_debug");

        const result = await this.debouncer.debounce();
        if (!result) {
            return [];
        }
        // if (context.selectedCompletionInfo) {
        //     return [];
        // }
        if (this.devchatConfig.get("complete_enable") !== true) {
            return [];
        }

        // const filepath = document.uri.fsPath;
        // const fileContent = document.getText();
        // const posOffset = document.offsetAt(position);
        // await outputAst(filepath, fileContent, posOffset);
        // // await testTreesitterQuery(filepath, fileContent);
        // const result2 = await findSimilarCodeBlock(filepath, fileContent, position.line, position.character);
        // logger.channel()?.info("Result:", result2);
        // if (1) {
        //     return [];
        // }

        let response: CodeCompleteResult | undefined = undefined;

        // 获取当前行光标之前的文本内容
        const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
        // 如果this.previousPrefix + this.previousCodeComplete包含“当前行光标之前内容”，且index为0，那么不需要执行代码补全
        if (this.previousPrefix && this.previousCodeComplete && this.previousCodeComplete.code.length > 0) {
            const index = (this.previousPrefix + this.previousCodeComplete.code).indexOf(linePrefix);
            if (index !== -1) {
                response = JSON.parse(JSON.stringify(this.previousCodeComplete));
                if (response) {
                    response.code = (this.previousPrefix + this.previousCodeComplete.code).slice(index + linePrefix.length);
                }
            }
        }
        if (!response) {
            response = await this.codeComplete(document, position, context, token);
        }
        if (!response) {
            return [];
        }

        if (token.isCancellationRequested) {
            return [];
        }

        // 获取当前行中光标之后的文本内容
        const lineSuffix = document.lineAt(position.line).text.slice(position.character).trim();
        const isIncludeLineSuffix = isSubsequence(lineSuffix, response.code.split("\n")[0]);
        let rangeEndPosition = position.translate(0, response.code.length);
        if (!isIncludeLineSuffix) {
            if (!response.receiveNewLine) {
                rangeEndPosition = position;
            } else {
                // result will not be shown
                return [];
            }
        }

        // TODO
        // 代码补全建议是否已经被用户看到，这个需要更加准确的方式来识别。
        if (completeDebug) {
            logger.channel()?.info("code complete show.");
        }
        this.logEventToServer(
            {
                completion_id: response.id,
                type: "view",
                lines: response.code.split('\n').length,
                length: response.code.length
            });
        // log to server

        const logRejectionTimeout: NodeJS.Timeout = setTimeout(() => {
            if (completeDebug) {
                logger.channel()?.info("code complete not accept.");
            }
        }, 10_000);

        // 代码补全回调处理
        const callback = () => {
            if (completeDebug) {
                logger.channel()?.info("accept:", response!.id);
            }
            // delete cache
            this.cache.delete(response!.prompt);
            // delete timer
            clearTimeout(logRejectionTimeout);
            // log to server
            this.logEventToServer(
                {
                    completion_id: response!.id,
                    type: "select",
                    lines: response!.code.split('\n').length,
                    length: response!.code.length
                });
        };

        this.lastComplete = response.code;
        this.previousCodeComplete = response;
        this.previousPrefix = linePrefix;

        return [
            new vscode.InlineCompletionItem(
                response.code,
                new vscode.Range(
                    position,
                    rangeEndPosition
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
