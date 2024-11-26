import * as vscode from 'vscode';
import * as path from 'path';

import { logger } from '../../util/logger';
import Debouncer from './debouncer';
import MemoryCacheManager from './cache';
import { createPrompt, findSimilarCodeBlock } from './promptCreator';
import { CodeCompleteResult, CodeCompleteResultWithMeta, LLMStreamComplete } from './chunkFilter';
import { DevChatConfig } from '../../util/config';
import { outputAst } from './astTest';
import { getEndOfLine } from './ast/language';
import { RecentEditsManager } from './recentEdits';
import { GitDiffWatcher } from './gitDiffWatcher';
import { MessageHandler } from '../../handler/messageHandler';

export function registerCodeCompleteCallbackCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "DevChat.codecomplete_callback",
        async (callback: any) => {
            logger.channel()?.trace(`Trigger codecomplete callback command`);
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
    is_manual_trigger: boolean;
    type: string; // "view", "select"
    lines: number;
    length: number; // length of code completed
    ide: string; 
    language: string;
    cache_hit: boolean;
    prompt_time: number;
    llm_time: number;
    model: string;
}

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private debouncer: Debouncer;
    private cache: MemoryCacheManager;
    private devchatConfig: DevChatConfig;
    private lastComplete: string;
    private recentEditors: RecentEditsManager;
    private previousCodeComplete: CodeCompleteResult | undefined;
    private previousPrefix: string | undefined;
    private preCompletionItem: vscode.InlineCompletionItem | undefined;
    private isManualTrigger: boolean = false;

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
        MessageHandler.sendMessage2({command: "logEvent", id: event.completion_id, language: event.language, name: event.type, value: {...event}});
    }

    async logMessageToServer(id: string, language: string, model: string, result: string) {
        MessageHandler.sendMessage2({command: "logMessage", id: id, language, commandName: "code_completion", content: result, model});
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

    async triggerCodeComplete(document: vscode.TextDocument, position: vscode.Position) {
        this.isManualTrigger = true;
        await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
        // 重置标记，以便下次正常检查配置
        setTimeout(() => {
            this.isManualTrigger = false;
        }, 100);
    }

    async codeComplete(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<CodeCompleteResultWithMeta | undefined> {
        logger.channel()?.debug("codeComplete called");
        const startTime = process.hrtime();
        GitDiffWatcher.getInstance().tryRun();
        
        // create prompt
        const fsPath = document.uri.fsPath;
        const fileContent = document.getText();
        const posOffset = document.offsetAt(position);

        logger.channel()?.debug(`cur position: ${position.line}: ${position.character}`);

        const prompt = await createPrompt(fsPath, fileContent, position.line, position.character, posOffset, this.recentEditors.getEdits());
        if (!prompt) {
            logger.channel()?.debug("prompt is empty");
            return undefined;
        }
        logger.channel()?.trace("prompt:", prompt);

        // check cache
        const result = await this.cache.get(prompt);
        if (result) {
            logger.channel()?.debug(`cache hited:\n${result.code}`);
            return {
                "result": result,
                "cacheHit": true,
                "promptBuildTime": 0,
                "llmComputeTime": 0,
            };
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

        const endTime = process.hrtime(startTime);
        const duration = endTime[0] + endTime[1] / 1e9;
        logger.channel()?.debug(`Make prompt took ${duration} seconds`);
        const startTimeLLM = process.hrtime();

        const completor = new LLMStreamComplete(token, lines, position.line, position.character);
        const response = await completor.llmStreamComplete(prompt);
        if (!response || response.code.length === 0) {
            return undefined;
        }

        const endTimeLLM = process.hrtime(startTimeLLM);
        const durationLLM = endTimeLLM[0] + endTimeLLM[1] / 1e9;
        logger.channel()?.debug(`LLMStreamComplete took ${durationLLM} seconds`);

        if (token.isCancellationRequested) {
            return undefined;
        }

        // cache result
        this.cache.set(prompt, response);
        return {
            "result": response,
            "cacheHit": false,
            "promptBuildTime": Math.floor(duration*1000),
            "llmComputeTime": Math.floor(durationLLM*1000),
        };
    }

    async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | null> {
        const result = await this.debouncer.debounce();
        if (!result) {
            return [];
        }
        // if (context.selectedCompletionInfo) {
        //     return [];
        // }
        if (!this.isManualTrigger && this.devchatConfig.get("complete_enable") !== true) {
            return [];
        }
        const isManualTrigger = this.isManualTrigger;

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

        let response: CodeCompleteResultWithMeta | undefined = undefined;

        // 获取当前光标前三行代码
        let preLinesNum = 4;
        const startLine = Math.max(0, position.line - preLinesNum);
        const linePrefix = document.getText(new vscode.Range(startLine, 0, position.line, position.character));
        
        // 如果this.previousPrefix + this.previousCodeComplete包含“当前行光标之前内容”，且index为0，那么不需要执行代码补全
        if (this.previousPrefix && this.previousCodeComplete && this.previousCodeComplete.code.length > 0) {
            const index = (this.previousPrefix + this.previousCodeComplete.code).indexOf(linePrefix);
            if (index !== -1) {
                return [this.preCompletionItem!];
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
        const isIncludeLineSuffix = isSubsequence(lineSuffix, response.result.code.split("\n")[0]);
        let rangeEndPosition = position.translate(0, response.result.code.length);
        if (!isIncludeLineSuffix) {
            if (!response.result.receiveNewLine) {
                rangeEndPosition = position;
            } else {
                // result will not be shown
                return [];
            }
        }

        this.logMessageToServer(
            response.result.id,
            path.extname(document.uri.fsPath).toLowerCase().slice(1),
            DevChatConfig.getInstance().get("complete_model") ?? "unknow",
            response.result.code
        );

        // TODO
        // 代码补全建议是否已经被用户看到，这个需要更加准确的方式来识别。
        logger.channel()?.trace("code complete show.");
        this.logEventToServer(
            {
                completion_id: response.result.id,
                is_manual_trigger: isManualTrigger,
                type: "view",
                lines: response.result.code.split('\n').length,
                length: response.result.code.length,
                ide: "vscode",
                language: path.extname(document.uri.fsPath).toLowerCase().slice(1),
                cache_hit: response.cacheHit,
                prompt_time: response.promptBuildTime,
                llm_time: response.llmComputeTime,
                model: DevChatConfig.getInstance().get("complete_model") ?? "unknow",
            });
        // log to server

        const logRejectionTimeout: NodeJS.Timeout = setTimeout(() => {
            logger.channel()?.trace("code complete not accept.");
        }, 10_000);

        // 代码补全回调处理
        const callback = () => {
            logger.channel()?.trace("accept:", response!.result.id);
            // delete cache
            this.cache.delete(response!.result.prompt);
            // delete timer
            clearTimeout(logRejectionTimeout);
            // log to server
            this.logEventToServer(
                {
                    completion_id: response!.result.id,
                    is_manual_trigger: isManualTrigger,
                    type: "select",
                    lines: response!.result.code.split('\n').length,
                    length: response!.result.code.length,
                    ide: "vscode",
                    language: path.extname(document.uri.fsPath).toLowerCase().slice(1),
                    cache_hit: response!.cacheHit,
                    prompt_time: response!.promptBuildTime,
                    llm_time: response!.llmComputeTime,
                    model: DevChatConfig.getInstance().get("complete_model") ?? "unknow",
                });
        };

        this.lastComplete = response.result.code;
        this.previousCodeComplete = response.result;
        this.previousPrefix = linePrefix;

        const currentLinePrefix = document.lineAt(position.line).text.slice(0, position.character);
        const codeCompleted = currentLinePrefix + response.result.code;
        const rangeStartPosition = new vscode.Position(position.line, 0);

        this.preCompletionItem = new vscode.InlineCompletionItem(
            codeCompleted,
            new vscode.Range(
                rangeStartPosition,
                rangeEndPosition
            ),
            {
                title: "code complete accept",
                command: "DevChat.codecomplete_callback",
                arguments: [callback],
            }
        );
        return [
            this.preCompletionItem
        ];
    }
}
