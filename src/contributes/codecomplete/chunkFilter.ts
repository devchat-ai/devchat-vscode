/*
 对实时返回的chunk进行过滤，判断当前是否已经满足停止条件，避免无效代码占用补全时间
*/
import * as vscode from 'vscode';

import { logger } from '../../util/logger';
import { CodeCompletionChunk, streamComplete } from './llm';
import { getCommentPrefix } from './ast/language';


// 代码补全返回结果定义
export interface CodeCompleteResult {
    prompt: string;
    code: string;
    id: string;
    receiveNewLine: boolean;
}


export class LLMStreamComplete {
    private token: vscode.CancellationToken;
    private contentLines: string[] = [];
    private curlineIndent: number = 0;
    private nextLine: string = "";
    private curLine: string = "";
    private curLineNum: number = 0;
    private curColumn: number = 0;
    constructor(token: vscode.CancellationToken, contentLines: string[], curLineNum: number, curColumn: number) {
        this.contentLines = contentLines;
        this.curLineNum = curLineNum;
        let curlineIndent = 0;
        for (let i = 0; i < this.contentLines[curLineNum].length; i++) {
            if (this.contentLines[curLineNum][i] === ' ') {
                curlineIndent += 1;
            } else if (this.contentLines[curLineNum][i] === '\t') {
                curlineIndent += 4;
            } else {
                break;
            }
        }

        if (curlineIndent === -1) {
            curlineIndent = this.contentLines[curLineNum].length;
        }

        let nextLine = this.contentLines[curLineNum].slice(curColumn);
        if (nextLine.trim().length === 0) {
            for (let i = curLineNum + 1; i < this.contentLines.length; i++) {
                if (this.contentLines[i].trim().length > 0) {
                    nextLine = this.contentLines[i];
                    break;
                }
            }
        };

        const curLine = this.contentLines[curLineNum];

        this.token = token;
        this.curlineIndent = curlineIndent;
        this.nextLine = nextLine;
        this.curLine = curLine;
        this.curColumn = curColumn;
    }

    async * chunkStopCanceled(chunks: AsyncIterable<CodeCompletionChunk>) {
        for await (const chunk of chunks) {
            if (this.token.isCancellationRequested) {
                logger.channel()?.trace("stop on canceled");
                break;
            }
            yield chunk;
        }
    }

    async *stopOnFilenameComment(chunks: AsyncIterable<CodeCompletionChunk>, filePath: string): AsyncIterable<CodeCompletionChunk> {
        const commentPrefix = await getCommentPrefix(filePath);
        for await (const chunk of chunks) {
          // 如果遇到特定的注释标记，则停止生成过程
          if(chunk.text.includes(`${commentPrefix}<filename>`)) {
            logger.channel()?.trace(`stopOnFilenameComment: ${chunk.text}`);
            return; // 直接退出生成器函数
          }
          yield chunk;
        }
    }

    async *stopOnOmittedCodeComment(chunks: AsyncIterable<CodeCompletionChunk>, filePath: string): AsyncIterable<CodeCompletionChunk> {
        const commentPrefix = await getCommentPrefix(filePath);
        for await (const chunk of chunks) {
          // 如果遇到特定的注释标记，则停止生成过程
          if(chunk.text.includes(`//Code omitted...`)) {
            logger.channel()?.trace(`stopOnOmittedCodeComment: ${chunk.text}`);
            return; // 直接退出生成器函数
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
                logger.channel()?.trace("stopWhenFirstCharIsNewLine");
                break;
            }
            isFirst = false;
            yield chunk;
        }
    }

    // 当前chunk中字符串不是以行为单位，需要重新整合为以行为单位。
    async * toLines(chunks: AsyncIterable<CodeCompletionChunk>, receiveNewLineConfig: {"newLine": boolean}) {
        let line = "";
        let id = "";
        for await (const chunk of chunks) {
            if (chunk.id) {
                id = chunk.id;
            }

            line += chunk.text;
            while (line.indexOf("\n") !== -1) {
                receiveNewLineConfig.newLine = true;
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
            yield chunk;

            if (firstChunk) {
                if (["}", "]", ")"].includes(chunk.text.trim())) {
                    logger.channel()?.trace("stopAtFirstBrace: stop at first brace");
                    break;
                }
                if (chunk.text.trim().length > 0) {
                    firstChunk = false;
                }
            }
        }
    }

    async * stopWhenSameWithNext(chunks: AsyncIterable<CodeCompletionChunk>) {
        let firstChunk: boolean = true;
        for await (const chunk of chunks) {
            if (firstChunk) {
                const curlineText = this.curLine + chunk.text;
                if (curlineText.trim() === this.nextLine.trim() && this.nextLine.trim().length > 5) {
                    logger.channel()?.trace("stopAtFirstBrace: same with next line");
                    break;
                }
                firstChunk = false;
            }

            if (chunk.text.trim() === this.nextLine.trim() && this.nextLine.trim().length > 1) {
                logger.channel()?.trace("stopAtFirstBrace: same with next line");
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
                const chunkText = chunk.text.trim();
                let isBrace = false;
                
                if (chunkText.length > 0 && ["{", "(", "["].includes(chunkText.slice(-1))) {
                    isBrace = true;
                }
                if (inMiddleLine && !isBrace) {
                    logger.channel()?.trace("stopAtFirstBrace: inMiddleLine, receive chunk: " + chunkText);
                    break;
                }
            }
        }
    }

    

    async * stopAtSameBlock(chunks: AsyncIterable<CodeCompletionChunk>) {
        let index = 0;
        let preIndent = -1;
        let hasIndentBigger = false;
        let firstChunk = true;

        for await (const chunk of chunks) {
            let lineIndent = 0;
            for (let i=0; i<chunk.text.length; i++) {
                if (chunk.text[i] === " ") {
                    lineIndent += 1;
                } else if (chunk.text[i] === "\t") {
                    lineIndent += 4;
                } else {
                    break;
                }
            }
            if (firstChunk) {
                lineIndent = this.curlineIndent;
                firstChunk = false;
            } else {
            }

            if (index > 0 && chunk.text.trim().length > 0 && lineIndent < this.curlineIndent ) {
                logger.channel()?.trace(`stopAtSameBlock1: ${chunk.text} ${lineIndent} ${this.curlineIndent}`);
                break;
            }
            if (index > 0 && preIndent === 0 && lineIndent === 0) {
                logger.channel()?.trace(`stopAtSameBlock2: ${chunk.text}`);
                break;
            }
            if (index > 0 && hasIndentBigger && lineIndent === this.curlineIndent && chunk.text.trim().length > 0 && ![')',']', '}'].includes(chunk.text.trim()[0])) {
                logger.channel()?.trace(`stopAtSameBlock3: ${chunk.text}`);
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

    // whether lines are repeated some block before
    async removeRepeatBlock(lines: string[]): Promise< string[] > {
        if (lines.length <= 1) {
            return lines;
        }

        // find first match line in before 50 lines
        let firstMatchLine = -1;
        for (let i = this.curLineNum - 1; i >= 0 && i >= this.curLineNum - 50; i--) {
            if (this.contentLines[i].trim() === lines[0].trim()) {
                firstMatchLine = i;
                break;
            }
        }

        if (firstMatchLine === -1) {
            return lines;
        }

        let isAllMatch = true;
        for (let i = 0; i < lines.length; i++) {
            if (this.contentLines[firstMatchLine + i].trim() !== lines[i].trim()) {
                isAllMatch = false;
                break;
            }
        }
        
        if (isAllMatch && firstMatchLine + lines.length >= this.curLineNum) {
            logger.channel()?.trace(`All lines are repeated in before 50 lines, remove them.`);
            return [];
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
        let receiveNewLineConfig: {"newLine": boolean} = {"newLine": false};

        const chunks = streamComplete(prompt);
        const chunks2 = this.chunkStopCanceled(chunks);
        const chunks3 = this.toLines(chunks2, receiveNewLineConfig);
        const chunks4 = this.stopAtFirstBrace(chunks3);
        const chunks5 = this.stopFirstLineWhenInMiddleLine(chunks4);
        const chunks6 = this.stopWhenSameWithNext(chunks5);
        const chunks7 = this.stopAtSameBlock(chunks6);
        const chunks8 = this.stopOnFilenameComment(chunks7, vscode.window.activeTextEditor?.document.fileName!);
        const chunks9 = this.stopOnOmittedCodeComment(chunks8, vscode.window.activeTextEditor?.document.fileName!);
        
        let id = "";
        let lines: string[] = [];
        for await (const chunk of chunks9) {
            lines.push(chunk.text);
            if (chunk.id) {
                id = chunk.id;
            }
        }

        const line2 = await this.removeEmptyEndlines(lines);
        const line3 = await this.removeRepeatBlock(line2);

        const completionCode = line3.join("");

        logger.channel()?.info("code:", completionCode);
        return { prompt, code: completionCode, id, receiveNewLine: receiveNewLineConfig.newLine };
    }
}
