import * as path from 'path';
import * as fs from 'fs';
import { getAst, getTreePathAtCursor, RangeInFileWithContents } from "./ast/ast";
import Parser from "web-tree-sitter";
import { logger } from "../../util/logger";
import { getCommentPrefix, getLangageFunctionConfig, getLanguageFullName, LanguageFunctionsConfig } from "./ast/language";
import { getLanguageForFile, getQueryVariablesSource } from './ast/treeSitter';


function printTree(node: Parser.SyntaxNode, indent: number = 0) {
    let treeText = `${' '.repeat(indent)}Node type: ${node.type}, Position: ${node.startPosition.row}:${node.startPosition.column} - ${node.endPosition.row}:${node.endPosition.column}\n`;

    // 遍历子节点
    for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        treeText += printTree(child!, indent + 2); // 增加缩进
    }
    return treeText;
}

export async function outputAst(
    filepath: string,
    contents: string,
    cursorIndex: number
) {
    const ast = await getAst(filepath, contents);
    if (!ast) {
        return [];
    }

    // output ast
    const treeText = "\n" + printTree(ast.rootNode, 0);
    logger.channel()?.info(treeText);
}
