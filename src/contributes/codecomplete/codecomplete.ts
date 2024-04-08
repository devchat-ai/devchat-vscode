import * as vscode from 'vscode';

import { logger } from '../../util/logger';
import Debouncer from './debouncer';
import MemoryCacheManager from './cache';
import { createPrompt } from './promptCreator';
import { CodeCompleteResult, LLMStreamComplete } from './chunkFilter';
import { nvidiaStarcoderComplete } from './llm';


export function registerCodeCompleteCallbackCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "DevChat.codecomplete_callback",
        async (callback: any) => {
            callback();
        }
    );

    context.subscriptions.push(disposable);
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

    async codeComplete(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<CodeCompleteResult | undefined> {
        // TODO
        // create prompt
        const fsPath = document.uri.fsPath;
        const fileContent = document.getText();
        const prompt = await createPrompt(fsPath, fileContent, position.line, position.character);

        // check cache
        const result = await this.cache.get(prompt);
        if(result) {
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
        if(!result) {
            return [];
        }

        const response: CodeCompleteResult | undefined = await this.codeComplete(document, position, context, token);
        if(!response) {
            return [];
        }

        if (token.isCancellationRequested) {
            return [];
        }

        // TODO
        // 代码补全建议是否已经被用户看到，这个需要更加准确的方式来识别。
        logger.channel()?.info("code complete show.");

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

        // // 等待时间（单位：毫秒），可根据需要调整
        // const delayTime = 5000;

        // // 创建一个新的Promise，用于实现等待逻辑
        // await new Promise((resolve) => {
        //     const timer = setTimeout(resolve, delayTime);
            
        //     // 如果请求在等待时间结束前被取消，则清除定时器
        //     token.onCancellationRequested(() => clearTimeout(timer));
        // });
		// logger.channel()?.info("----->");

        // // 如果请求已被取消，则直接返回null
        // if (token.isCancellationRequested) {
        //     logger.channel()?.info("request cancelled before completion");
        //     return [];
        // }

		// // 根据文档和位置计算补全项（这里仅作示例，实际实现可能会有所不同） 
		// // 获取position前文本
		// const documentText = document.getText();
		// const offsetPos = document.offsetAt(position);

		// // 获取position前文本
		// const prefix = documentText.substring(0, offsetPos);
		// const suffix = documentText.substring(offsetPos);

		// const prompt = "<fim_prefix>" + prefix + "<fim_suffix>" + suffix + "<fim_middle>";

		// // call code_completion
		// const response = await code_completion(prompt);
		// if (!response) {
		// 	logger.channel()?.info("finish provideInlineCompletionItems");
		// 	return [];
		// }

		// logger.channel()?.info("finish provideInlineCompletionItems");
		// return [new vscode.InlineCompletionItem(response[0], new vscode.Range(position, position))];  
    }  
}
