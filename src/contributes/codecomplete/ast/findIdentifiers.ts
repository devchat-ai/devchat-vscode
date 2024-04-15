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

const identifierQueryCache: MemoryCacheManager = new MemoryCacheManager(4);

export async function visitAstNode(node: Parser.SyntaxNode, identifiers: Parser.SyntaxNode[], startLine: number | undefined = undefined, endLine: number | undefined = undefined) {
    const regex = /^[a-zA-Z_][0-9a-zA-Z_]*$/;
    // visit children of node
    for (let child of node.children) {
        // visit children, if child has children nodes
        if (child.childCount > 0) {
            if (startLine !== undefined && endLine !== undefined) {
                if (child.startPosition.row > endLine || child.endPosition.row < startLine) {
                    continue;
                }
                visitAstNode(child, identifiers, startLine, endLine);
            } else {
                visitAstNode(child, identifiers, startLine, endLine);
            }
        } else {
            const isIdentifier = regex.test(child.text);

            if (startLine !== undefined && endLine!== undefined) {
                if (child.startPosition.row >= startLine && child.endPosition.row <= endLine) {
                    if (isIdentifier && child.text.length >= 3) {
                        identifiers.push(child);
                    }
                }
            } else {
                if (isIdentifier && child.text.length >= 3) {
                    identifiers.push(child);
                }
            }
        }
    }
}

export async function findIdentifiersInAstNodeRange(node: Parser.SyntaxNode, startLine: number, endLine: number): Promise<Parser.SyntaxNode[]> {
    const identifiers: Parser.SyntaxNode[] = [];
    await visitAstNode(node, identifiers, startLine, endLine);
    return identifiers;
}

export async function findIdentifiers(filepath: string, node: Parser.SyntaxNode): Promise<Parser.SyntaxNode[]> {
    try {
        const lang = await getLanguageForFile(filepath);
        if (!lang) {
            return [];
        }

        let querySource = "(identifier) @identifier";
        const extension = filepath.split('.').pop() || '';
        if (extension === 'kt') {
            querySource = "(simple_identifier) @identifier";
        }

        try {
            let query: Parser.Query | undefined = identifierQueryCache.get(extension);
            if (!query) {
                query = lang?.query(querySource);
                identifierQueryCache.set(extension, query);
            }
            const matches = query?.matches(node);

            if (!matches || matches.length === 0) {
                let identifiers: Parser.SyntaxNode[] = [];
                await visitAstNode(node, identifiers);
                return identifiers;
            } else {
                return matches?.map((match) => match.captures[0].node) ?? [];
            }
        } catch(error) {
            let identifiers: Parser.SyntaxNode[] = [];
            await visitAstNode(node, identifiers);
            return identifiers;
        }
    } catch (error) {
        logger.channel()?.error(`findIdentifiers error: ${error}`);
        return [];
    }
}

