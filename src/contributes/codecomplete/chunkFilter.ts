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
    private nextLine: string = "";
    private curLine: string = "";
    private curColumn: number = 0;
    constructor(token: vscode.CancellationToken, curlineIndent: number, nextLine: string, curLine: string, curColumn: number) {
        this.token = token;
        this.curlineIndent = curlineIndent;
        this.nextLine = nextLine;
        this.curLine = curLine;
        this.curColumn = curColumn;
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

    async * stopAtFirstBrace(chunks: AsyncIterable<CodeCompletionChunk>) {
        let firstChunk = true;
        for await (const chunk of chunks) {
            if (firstChunk) {
                if (["}", "]", ")"].includes(chunk.text.trim())) {
                    break;
                }
                if (chunk.text.trim().length > 0) {
                    firstChunk = false;
                }
            }

            yield chunk;
        }
    }

    async * stopWhenSameWithNext(chunks: AsyncIterable<CodeCompletionChunk>) {
        let firstChunk: boolean = true;
        for await (const chunk of chunks) {
            if (firstChunk) {
                const curlineText = this.curLine + chunk.text;
                if (curlineText.trim() === this.nextLine.trim() && this.nextLine.trim().length > 5) {
                    break;
                }
                firstChunk = false;
            }

            if (chunk.text.trim() === this.nextLine.trim() && this.nextLine.trim().length > 5) {
                break;
            }

            yield chunk;
        }
    }

    async * stopFirstLineWhenInMiddleLine(chunks: AsyncIterable<CodeCompletionChunk>) {
        let inMiddleLine = false;
        const prefixLine = this.curLine.slice(0, this.curColumn).trim();
        if (prefixLine.length > 0) {
            inMiddleLine = true;
        }

        let firstChunk = true;
        for await (const chunk of chunks) {
            yield chunk;

            if (firstChunk) {
                firstChunk = false;
                if (inMiddleLine) {
                    break;
                }
            }
        }
    }

    async * stopAtSameBlock(chunks: AsyncIterable<CodeCompletionChunk>) {
        let index = 0;
        let preIndent = -1;
        let hasIndentBigger = false;
        let sameIndentTimes = 0;
        for await (const chunk of chunks) {
            let lineIndent = chunk.text.search(/\S/);
            if (lineIndent === -1) {
                lineIndent = this.curlineIndent;
            }
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

    async removeEmptyEndlines(lines: string[]): Promise< string[] > {
        // remove empty lines at the end
        while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
            lines.pop();
        }
        if (lines.length > 0 && lines[lines.length - 1].endsWith("\n")) {
            lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
        }

        return lines;
    }

    // async removeRepeatEndBrace(lines: string[]): Promise< string[] > {
    //     let allIsBrace = true;
    //     for (let i=1; i<lines.length; i++) {
    //         if (lines[i].trim() !== lines[0].trim()) {
    //             allIsBrace = false;
    //             break;
    //         }
    //         if (lines[i].trim().length > 1){
    //             allIsBrace = false;
    //             break;
    //         }
    //     }
    //     if (allIsBrace) {
    //         lines = [lines[0]];
    //     }

    //     if (lines.length === 1) {
    //         const trim1 = lines[0].trim();
    //         const trim2 = this.nextLine.trim();
    //         if (trim1 === trim2 && trim1.length === 1) {
    //             return [];
    //         }
    //     }
    //     return lines;
    // }

    async llmStreamComplete(prompt: string) : Promise<CodeCompleteResult | undefined> {
        // TODO
        // 对LLM的异常进行捕获，避免中断代码补全

        const chunks = streamComplete(prompt);
        const chunks2 = this.chunkStopCanceled(chunks);
        const chunks3 = this.toLines(chunks2);
        const chunks4 = this.stopAtFirstBrace(chunks3);
        const chunks5 = this.stopFirstLineWhenInMiddleLine(chunks4);
        const chunks6 = this.stopWhenSameWithNext(chunks5);
        const chunks7 = this.stopAtSameBlock(chunks6);

        let id = "";
        let lines: string[] = [];
        for await (const chunk of chunks7) {
            lines.push(chunk.text);
            if (chunk.id) {
                id = chunk.id;
            }
        }

        const line2 = await this.removeEmptyEndlines(lines);

        const completionCode = line2.join("");

        logger.channel()?.info("code:", completionCode);
        return { prompt, code: completionCode, id };
    }
}
