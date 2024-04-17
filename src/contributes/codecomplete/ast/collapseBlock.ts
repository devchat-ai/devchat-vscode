/*
 针对代码补全功能，构建prompt

 prompt的好坏，取决于提供的上下文信息。
 通过AST获取相对完整的信息，可能会增加提示的准确度，但也会增加代码提示的复杂度。
 */

 import { logger } from "../../../util/logger";
 import { getAst, getTreePathAtCursor, RangeInFileWithContents } from "./ast";
 import Parser from "web-tree-sitter";
 import { getCommentPrefix, getLangageFunctionConfig, LanguageFunctionsConfig } from "./language";
import { findFunctionRanges, FunctionRange } from "./findFunctions";
 

export async function collapseFile(
    filepath: string,
    contents: string,
) : Promise< string > {
   const ast = await getAst(filepath, contents);
   if (!ast) {
       return "";
   }

   const functionRanges = await findFunctionRanges(filepath, ast.rootNode);
   return await collapseAllCodeBlock(functionRanges, filepath, contents);
}

 export async function collapseAllCodeBlock(functions: FunctionRange[], filepath: string, contents: string) {
    const commentPrefix = await getCommentPrefix(filepath);
    const lines = contents.split("\n");
 
    // visit functions in reverse order
    for (const func of functions.reverse()) {
        const funcDefine = func.define;
        const funcBody = func.body;
 
        if (funcBody.start === funcBody.end) {
            continue;
        }
        if (func.name === "__init__" || func.name === "constructor") {
            continue;
        }
 
        let bodyStartLine = funcBody.start.row;
        let bodyEndLine = funcBody.end.row;
        if (funcDefine.start.row === funcBody.start.row) {
            bodyStartLine = funcBody.start.row + 1;
            bodyEndLine = funcBody.end.row - 1;
        }
        const lineBeforeBodyStart = lines[funcBody.start.row].slice(0, funcBody.start.column);
        if (lineBeforeBodyStart.trim() !== "") {
            bodyStartLine = funcBody.start.row + 1;
            bodyEndLine = funcBody.end.row - 1;
        }
 
        if (bodyEndLine - bodyStartLine <= 3) {
            continue;
        }
 
        // replace lines from bodyStartLine to bodyEndLine with "..."
        // 获取bodyStartLine这一行的缩进字符，需要在"..."之前添加对应的缩进
        let indent = lines[bodyStartLine].search(/\S/);
        if (indent === -1) {
            indent = lines[bodyStartLine].length;
        }
        const indentStr = " ".repeat(indent);
        lines.splice(bodyStartLine, bodyEndLine - bodyStartLine + 1, `${indentStr}${commentPrefix}Code omitted...`);
    }

    return lines.join("\n");
}


export async function collapseFileExculdeSelectRange(
                                        filepath: string,
                                        contents: string,
                                        startRow: number,
                                        endRow: number) : Promise< string > {
   const ast = await getAst(filepath, contents);
   if (!ast) {
       return "";
   }

   const functionRanges = await findFunctionRanges(filepath, ast.rootNode);
   return await collapseAllCodeBlockExculdeSelectRange(functionRanges, filepath, contents, startRow, endRow);
}

export async function collapseAllCodeBlockExculdeSelectRange(
                                            functions: FunctionRange[],
                                            filepath: string,
                                            contents: string,
                                            startRow: number,
                                            endRow: number) {
    const commentPrefix = await getCommentPrefix(filepath);
    const lines = contents.split("\n");
    
    let disableCollapseRanges: FunctionRange[] = [];
    for (const func of functions) {
        if (func.define.start.row > endRow || func.define.end.row < startRow) {
            continue;
        }

        disableCollapseRanges.push(func);
    }

    // visit functions in reverse order
    for (const func of functions.reverse()) {
        const funcDefine = func.define;
        const funcBody = func.body;

        if (funcBody.start === funcBody.end) {
            continue;
        }
        if (func.name === "__init__" || func.name === "constructor") {
            continue;
        }

        let bodyStartLine = funcBody.start.row;
        let bodyEndLine = funcBody.end.row;
        if (funcDefine.start.row === funcBody.start.row) {
            bodyStartLine = funcBody.start.row + 1;
            bodyEndLine = funcBody.end.row - 1;
        }
        // whether line before body start column is empty
        const lineBeforeBodyStart = lines[funcBody.start.row].slice(0, funcBody.start.column);
        if (lineBeforeBodyStart.trim() !== "") {
            bodyStartLine = funcBody.start.row + 1;
            bodyEndLine = funcBody.end.row - 1;
        }

        if (bodyEndLine - bodyStartLine <= 3) {
            continue;
        }
        let inDisableRange = false;
        for (const disableRange of disableCollapseRanges) {
            if (funcDefine === disableRange.define) {
                inDisableRange = true;
                break;
            }
        }
        if (inDisableRange) {
            continue;
        }

        // replace lines from bodyStartLine to bodyEndLine with "..."
        // 获取bodyStartLine这一行的缩进字符，需要在"..."之前添加对应的缩进
        let indent = lines[bodyStartLine].search(/\S/);
        if (indent === -1) {
            indent = lines[bodyStartLine].length;
        }
        const indentStr = " ".repeat(indent);
        lines.splice(bodyStartLine, bodyEndLine - bodyStartLine + 1, `${indentStr}${commentPrefix}Code omitted...`);
    }

    return lines.join("\n");
}