/*
 对实时返回的chunk进行过滤，判断当前是否已经满足停止条件，避免无效代码占用补全时间
*/
import * as vscode from 'vscode';

import { logger } from '../../util/logger';
import { CodeCompletionChunk, streamComplete } from './llm';


// 代码补全返回结果定义
export interface CodeCompleteResult {
    prompt: string;
    code: string;
    id: string;
}


export class LLMStreamComplete {
    private token: vscode.CancellationToken;
    private curlineIndent: number = 0;
    constructor(token: vscode.CancellationToken, curlineIndent: number) {
        this.token = token;
        this.curlineIndent = curlineIndent;
    }

    async * chunkStopCanceled(chunks: AsyncIterable<CodeCompletionChunk>) {
        for await (const chunk of chunks) {
            if (this.token.isCancellationRequested) {
                break;
            }
            yield chunk;
        }
    }

    // 过滤第一个就是换行符的chunk，避免补全时出现空行
    async * stopWhenFirstCharIsNewLine(chunks: AsyncIterable<CodeCompletionChunk>) {
        let isFirst = true;
        for await (const chunk of chunks) {
            if (chunk.text.length === 0) {
                yield chunk;
            }

            if (isFirst && chunk.text[0] === "\n") {
                break;
            }
            isFirst = false;
            yield chunk;
        }
    }

    // 当前chunk中字符串不是以行为单位，需要重新整合为以行为单位。
    async * toLines(chunks: AsyncIterable<CodeCompletionChunk>) {
        let line = "";
        let id = "";
        for await (const chunk of chunks) {
            if (chunk.id) {
                id = chunk.id;
            }

            line += chunk.text;
            while (line.indexOf("\n") !== -1) {
                const index = line.indexOf("\n");
                yield {
                    text: line.slice(0, index + 1),
                    id
                };
                line = line.slice(index + 1);
            }
        }

        if (line.length > 0) {
            yield { text: line, id };
        }
    }

    // async * stopAtLineEnd(chunks: AsyncIterable<CodeCompletionChunk>) {
    //     for await (const chunk of chunks) {
    //         if (chunk.text.indexOf("\n") !== -1) {
    //             chunk.text = chunk.text.slice(0, chunk.text.indexOf("\n"));
    //             yield chunk;
    //             break;
    //         }
    //         yield chunk;
    //     }
    // }

    async * stopAtSameBlock(chunks: AsyncIterable<CodeCompletionChunk>) {
        let index = 0;
        let preIndent = -1;
        let hasIndentBigger = false;
        let sameIndentTimes = 0;
        for await (const chunk of chunks) {
            let lineIndent = chunk.text.search(/\S/);
            if (index === 0) {
                lineIndent = this.curlineIndent;
            }

            if (index > 0 && chunk.text.trim().length > 0 && lineIndent < this.curlineIndent ) {
                break;
            }
            if (index > 0 && preIndent === 0 && lineIndent === 0) {
                break;
            }
            if (index > 0 && hasIndentBigger && lineIndent === this.curlineIndent && chunk.text.trim().length > 3) {
                break;
            }
            if (index > 0 && preIndent === lineIndent) {
                sameIndentTimes += 1;
            } else {
                sameIndentTimes = 0;
            }

            if (sameIndentTimes > 1) {
                break;
            }
            if (lineIndent > this.curlineIndent) {
                hasIndentBigger = true;
            }

            preIndent = lineIndent;

            index += 1;
            yield chunk;
        }
    }

    async llmStreamComplete(prompt: string) : Promise<CodeCompleteResult | undefined> {
        // TODO
        // 对LLM的异常进行捕获，避免中断代码补全

        const chunks = streamComplete(prompt);
        const chunks2 = this.chunkStopCanceled(chunks);
        const chunks3 = this.toLines(chunks2);
        const chunks4 = this.stopAtSameBlock(chunks3);

        let id = "";
        let completionCode = "";
        for await (const chunk of chunks4) {
            completionCode += chunk.text;
            if (chunk.id) {
                id = chunk.id;
            }
        }

        logger.channel()?.info("code:", completionCode);
        return { prompt, code: completionCode, id };
    }
}
