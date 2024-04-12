import * as fs from 'fs';
import Parser from "web-tree-sitter";
import { BlockInfo, FileBlockInfo } from "./types";
import { getAst } from "../ast/ast";
import { findFunctionRanges } from "../ast/findFunctions";
import { FunctionInfo, splitFileIntoBlocks } from "../symbolindex/embedding";
import { findIdentifiers } from "../ast/findIdentifiers";



// create FileBlockInfo by file
export async function createFileBlockInfo(file: string): Promise<FileBlockInfo | undefined> {
    // 读取文件内容
    const contents = fs.readFileSync(file, 'utf-8');

    // 对文件进行AST解析
    const ast: Parser.Tree | undefined = await getAst(file, contents, false);
    if (!ast) {
        return ;
    }

    // 获取函数范围
    const functionRanges = await findFunctionRanges(file, ast.rootNode);
    // 根据函数的范围，将分为拆分为不同的块
    const functionNewRanges: FunctionInfo[] = functionRanges.map((func) => {
        return {
            startLine: func.define.start.row,
            endLine: func.body.end.row,
        };
    });

    // 计算总行数
    const contentLines = contents.split('\n');
    const totalLines = contentLines.length;

    // 将文件拆分为不同的块
    const blocks = splitFileIntoBlocks(functionNewRanges, totalLines);

    // 获取文件中所有identifiers
    const identifiers: Parser.SyntaxNode[] = await findIdentifiers(file, ast.rootNode);

    // 根据identifier的位置，将其归属到对应范围的block中
    // block的顺序是从小到大排序，identifier也是从小到大排序，利用这个特性优化查找
    const blockIdentifiers: Map<number, Parser.SyntaxNode[]> = new Map();
    let currentBlockIndex = 0;
    identifiers.sort((a, b) => a.startPosition.row - b.startPosition.row);
    for (const identifier of identifiers) {
        while (currentBlockIndex < blocks.length && blocks[currentBlockIndex].endLine < identifier.startPosition.row) {
            currentBlockIndex++;
        }
        if (currentBlockIndex < blocks.length && blocks[currentBlockIndex].startLine <= identifier.startPosition.row) {
            if (!blockIdentifiers.has(currentBlockIndex)) {
                blockIdentifiers.set(currentBlockIndex, []);
            }
            blockIdentifiers.get(currentBlockIndex)?.push(identifier);
        }
    }

    // 遍历每个block，将其中的identifiers转化为BlockInfo
    const fileBlocInfok: FileBlockInfo = {
        path: file,
        // 记录文件的最后修改时间
        lastTime: fs.statSync(file).mtimeMs,
        // 根据文件内容计算唯一的hashKey，类似sha
        hashKey: await createHashKey(contents),
        blocks: [],
    };
    for (const [blockIndex, identifiers] of blockIdentifiers) {
        const block = blocks[blockIndex];
        const blockInfo: BlockInfo = {
            file: file,
            startLine: block.startLine,
            endLine: block.endLine,
            lastTime: fs.statSync(file).mtimeMs,
            identifiers: identifiers.map((identifier) => identifier.text).sort(),
        };
        fileBlocInfok.blocks.push(blockInfo);
    }

    return fileBlocInfok;
}

export async function createIdentifierSetByQuery(file: string, query: string): Promise<string[]> {
    const ast: Parser.Tree | undefined = await getAst(file, query, false);
    if (!ast) {
        return [];
    }

    return createIdentifierSetByQueryAst(file, ast.rootNode);
}

export async function createIdentifierSetByQueryAst(filepath: string, node: Parser.SyntaxNode): Promise<string[]> {
    const identifiers: Parser.SyntaxNode[] = await findIdentifiers(filepath, node);
    return identifiers.map((identifier) => identifier.text).sort();
}

export async function createHashKey(contents: string): Promise<string> {
    return require('crypto').createHash('sha256').update(contents).digest('hex');
}