import * as path from 'path';
import * as fs from 'fs';
import fspromises from 'fs/promises';
import { getAst } from '../ast/ast';
import Parser from 'web-tree-sitter';
import { UiUtilWrapper } from '../../../util/uiUtil';
import { findFunctionRanges } from '../ast/findFunctions';
import { findIdentifiers } from '../ast/findIdentifiers';
import { logger } from '../../../util/logger';


// 记录符号编码表
const symbolMap = new Map<string, number>();


export interface FunctionInfo {
    startLine: number;
    endLine: number;
}

export interface BlockInfo {
    startLine: number;
    endLine: number;
}

export async function loadSymbolMap(file: string) {
    if (symbolMap.size > 0) {
        return;
    }
    // 检查文件是否存在
    if (!fs.existsSync(file)) {
        return;
    }

    // 读取符号编码表
    const data = fs.readFileSync(file, 'utf-8');
    const lines = data.split('\n');
    for (const line of lines) {
        if (line.trim() === '') {
            continue;
        }

        const [symbol, index] = line.split(' ');
        symbolMap.set(symbol, parseInt(index));
    }
}

export async function updateSymbolMap(file: string) {
    // 生成结果字符串，准备写入文件
    let result = '';
    for (const [symbol, index] of symbolMap.entries()) {
        result += `${symbol} ${index}\n`;
    }

    // 写入文件
    fs.writeFileSync(file, result);
}

// 对文件进行切分，生成embedding
export async function embeddingBlocks(file: string): Promise< {vector: number[], meta: {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}}[] | undefined > {
    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspaceDir) {
        return ;
    }

    // 基于workspaceDir计算当前文件的相对路径
    const relativePath = path.relative(workspaceDir, file);
    // 拆分relativePath为数组
    const relativePathArray = relativePath.split(path.sep).slice(0, -1);

    // 加载符号编码表
    await loadSymbolMap(path.join(workspaceDir, ".chat", "index", 'symbolMap.txt'));

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

    // 对每个block中的identifiers进行embedding
    let symbolMapUpdated = false;
    let embeddingResult: {vector: number[], meta: {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}}[] = [];
    for (const [blockIndex, identifiers] of blockIdentifiers.entries()) {
        if (identifiers.length === 0) {
            continue;
        }

        let vector: number[] = new Array(5000).fill(0);
        const newIdentifiers: any[] = [...identifiers, ...relativePathArray];
        for (const identifier of newIdentifiers) {
            const symbol = (identifier.text ?? identifier).toLowerCase();
            if (symbolMap.has(symbol)) {
                vector[symbolMap.get(symbol)! - 1] = 1;
            } else {
                if (symbolMap.size >= 5000) {
                    logger.channel()?.error(`symbolMap size is too large, symbol: ${symbol}`);
                    continue;
                }
                symbolMapUpdated = true;
                const index = symbolMap.size;
                symbolMap.set(symbol, index + 1);
                vector[index] = 1;
            }
        }

        const blockText = contentLines.slice(blocks[blockIndex].startLine, blocks[blockIndex].endLine + 1).join('\n');
        // 利用block文本计算唯一SHA
        const hash = require('crypto').createHash('sha256').update(blockText).digest('hex');

        embeddingResult.push({
            vector: vector,
            meta: {
                path: relativePath,
                lastTime: (await fspromises.stat(file)).mtimeMs,
                startLine: blocks[blockIndex].startLine,
                endLine: blocks[blockIndex].endLine,
                hashKey: hash,
            }
        });
    }

    if (symbolMapUpdated) {
        await updateSymbolMap(path.join(workspaceDir, ".chat", "index", 'symbolMap.txt'));
    }

    return embeddingResult;
}



export async function embeddingQuery(filepath: string, query: string): Promise<number[] | undefined> {
    const ast: Parser.Tree | undefined = await getAst(filepath, query, false);
    if (!ast) {
        return ;
    }

    return embeddingQueryAst(filepath, ast.rootNode);
}

export async function embeddingQueryAst(filepath: string, node: Parser.SyntaxNode): Promise<number[] | undefined> {
    const identifiers: Parser.SyntaxNode[] = await findIdentifiers(filepath, node);
    // if (identifiers.length === 0) {
    //     return ;
    // }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspaceDir) {
        return ;
    }

    // 基于workspaceDir计算当前文件的相对路径
    const relativePath = path.relative(workspaceDir, filepath);
    // 拆分relativePath为数组
    const relativePathArray = relativePath.split(path.sep).slice(0, -1);

    // 加载符号编码表
    await loadSymbolMap(path.join(workspaceDir, ".chat", "index", 'symbolMap.txt'));

    let vector: number[] = new Array(5000).fill(0);
    const newIdentifiers: any[] = [...identifiers, ...relativePathArray];
    for (const identifier of newIdentifiers) {
        const symbol = (identifier.text ?? identifier).toLowerCase();
        if (symbolMap.has(symbol)) {
            vector[symbolMap.get(symbol)! - 1] = 1;
        }
    }

    return vector;
}

export async function getFileBlock(file: string, contents: string, line: number): Promise< string > {
    // 对文件进行AST解析
    const ast: Parser.Tree | undefined = await getAst(file, contents, false);
    if (!ast) {
        return "";
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
    // 找到包含指定行的块
    const block = blocks.find((block) => block.startLine <= line && block.endLine >= line);
    if (!block) {
        return "";
    }
    return contentLines.slice(block?.startLine, block?.endLine + 1).join('\n');
}

export function splitFileIntoBlocks(functions: FunctionInfo[], totalLines: number): BlockInfo[] {
    // 存储块的起始和结束行信息
    const blocks: BlockInfo[] = [];

    // 上一个块的结束行，初始化为0（行号从0开始）
    let previousEndLine = 0;

    functions.forEach((func) => {
        // 检查函数之前是否有代码块
        if (func.startLine > previousEndLine) {
            // 添加函数前的块
            blocks.push({startLine: previousEndLine, endLine: func.startLine - 1});
        }

        // 添加函数块
        blocks.push({startLine: func.startLine, endLine: func.endLine});

        // 更新上一个块的结束行
        previousEndLine = func.endLine + 1;
    });

    // 检查最后一个函数之后是否有代码块
    if (previousEndLine <= totalLines - 1) {
        // 添加最后一个块
        blocks.push({startLine: previousEndLine, endLine: totalLines - 1});
    }

    return blocks;
}
