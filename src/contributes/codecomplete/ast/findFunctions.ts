/*
 针对代码补全功能，构建prompt

 prompt的好坏，取决于提供的上下文信息。
 通过AST获取相对完整的信息，可能会增加提示的准确度，但也会增加代码提示的复杂度。
 */

import { logger } from "../../../util/logger";
import * as vscode from "vscode";
import { getAst, getTreePathAtCursor, RangeInFileWithContents } from "./ast";
import Parser from "web-tree-sitter";
import { getCommentPrefix, getLangageFunctionConfig, LanguageFunctionsConfig } from "./language";
import { getLanguageForFile, getQueryFunctionsSource } from "./treeSitter";
import MemoryCacheManager from "../cache";

const functionCache: MemoryCacheManager = new MemoryCacheManager(4);
 
export interface FunctionRange {
    define: {
        start: { row: number, column: number },
        end: { row: number, column: number }
    },
    body: {
        start: { row: number, column: number },
        end: { row: number, column: number }
    },
    name: string
}
 
export async function findFunctionRanges(filepath: string, node: Parser.SyntaxNode): Promise<FunctionRange[]> {
    const lang = await getLanguageForFile(filepath);
    if (!lang) {
        return [];
    }

    const querySource = await getQueryFunctionsSource(filepath);
    if (!querySource) {
        return [];
    }

    const extension = filepath.split('.').pop() || '';
    let query: Parser.Query | undefined = functionCache.get(extension);
    if (!query) {
        query = lang?.query(querySource);
        functionCache.set(extension, query);
    }
    const matches = query?.matches(node);

    const functionRanges: FunctionRange[] = [];
    if (matches) {
        for (const match of matches) {
            // find functionNode through tag name
            const functionNode = match.captures.find((capture) => capture.name === "function")?.node;
            const bodyNode = match.captures.find((capture) => capture.name === "function.body")?.node;
            const nameNode = match.captures.find((capture) => capture.name === "function.name")?.node;
            if (!functionNode || !bodyNode) {
                continue;
            }

            const functionRange: FunctionRange = {
                define: {
                    start: {
                        row: functionNode.startPosition.row,
                        column: functionNode.startPosition.column,
                    },
                    end: {
                        row: functionNode.endPosition.row,
                        column: functionNode.endPosition.column,
                    },
                },
                body: {
                    start: {
                        row: bodyNode.startPosition.row,
                        column: bodyNode.startPosition.column,
                    },
                    end: {
                        row: bodyNode.endPosition.row,
                        column: bodyNode.endPosition.column,
                    },
                },
                name: nameNode?.text ?? "",
            };

            // Check if this function range is not fully contained within another function range
            const isContained = functionRanges.some(range => {
                return (
                    range.define.start.row <= functionRange.define.start.row &&
                    range.define.end.row >= functionRange.define.end.row &&
                    range.body.start.row <= functionRange.body.start.row &&
                    range.body.end.row >= functionRange.body.end.row
                );
            });

            if (!isContained) {
                functionRanges.push(functionRange);
            }
        }
    }

    return functionRanges;
}

export async function findFunctionNodes(filepath: string, node: Parser.SyntaxNode): Promise<Parser.SyntaxNode[]> {
    const lang = await getLanguageForFile(filepath);
    if (!lang) {
        return [];
    }

    const querySource = await getQueryFunctionsSource(filepath);
    if (!querySource) {
        return [];
    }
    
    const extension = filepath.split('.').pop() || '';
    let query: Parser.Query | undefined = functionCache.get(extension);
    if (!query) {
        query = lang?.query(querySource);
        functionCache.set(extension, query);
    }
    const matches = query?.matches(node);
    let functionNodes: Parser.SyntaxNode[] = [];
    for (const match of matches?? []) {
        // find functionNode through tag name
        const functionNode = match.captures.find((capture) => capture.name === "function")?.node;
        if (functionNode) {
            functionNodes.push(functionNode);
        }
    }
    
    return functionNodes;
}
