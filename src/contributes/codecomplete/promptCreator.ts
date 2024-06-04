/*
 针对代码补全功能，构建prompt

 prompt的好坏，取决于提供的上下文信息。
 通过AST获取相对完整的信息，可能会增加提示的准确度，但也会增加代码提示的复杂度。
 */

import * as fs from 'fs/promises';
import * as fsF from 'fs';
import * as path from 'path';
import { logger } from "../../util/logger";
import { getAst, getAstNodeByRange, getTreePathAtCursor, RangeInFileWithContents } from "./ast/ast";
import Parser from "web-tree-sitter";
import { getCommentPrefix, getLangageFunctionConfig, LanguageFunctionsConfig } from "./ast/language";
import { findFunctionRanges, FunctionRange } from "./ast/findFunctions";
import { RecentEdit } from "./recentEdits";
import { getLanguageForFile, getQueryVariablesSource } from "./ast/treeSitter";
import { getDefinitions, getDefinitionsFromLsp, getTypeDefinitions } from "./lsp";
import { RangeInFile, readFileByVSCode, readRangeInFile, readRangesInFile, Range as AstRange, readRangesInFileContents } from "./utils";
import { collapseFile } from "./ast/collapseBlock";
import { UiUtilWrapper } from "../../util/uiUtil";
import { countTokens } from "./llm/countTokens";
import MemoryCacheManager from "./cache";
import { searchSimilarBlock } from "./astIndex";
import { GitDiffWatcher } from "./gitDiffWatcher";
import { findIdentifiersInAstNodeRange } from './ast/findIdentifiers';
import { DevChatConfig } from '../../util/config';


const CONTEXT_LIMITED_SIZE: number = 6000;
const CONTEXT_SIMILAR_LIMITED_SIZE: number = 400;

const variableCache: MemoryCacheManager = new MemoryCacheManager(4);
let symbleCollapsedDefine: Map<string, string> = new Map<string, string>();

export async function currentFileContext(
    filepath: string,
    contents: string,
    curRow: number,
    curColumn: number
) : Promise< { prefix: string, suffix: string } > {
    const contentTokens = countTokens(contents);
    if (contentTokens < CONTEXT_LIMITED_SIZE*0.35) {
        return curfilePrompt(filepath, contents, curRow, curColumn);
    }

    const ast = await getAst(filepath, contents);
    if (!ast) {
        return curfilePrompt(filepath, contents, curRow, curColumn);
    }

    const functionRanges = await findFunctionRanges(filepath, ast.rootNode);
    return await collapseCodeBlock(functionRanges, filepath, contents, curRow, curColumn);
    }


export async function collapseCodeBlock(functions: FunctionRange[], filepath: string, contents: string, curRow: number, curColumn: number) {
    const commentPrefix = await getCommentPrefix(filepath);
    const lines = contents.split("\n");
    
    let newCurRow = curRow;
    let newCurColumn = curColumn;

    // find function before and after cursor
    let preFunc: FunctionRange | undefined = undefined;
    let nextFunc: FunctionRange | undefined = undefined;
    let curFunc: FunctionRange | undefined = undefined;
    for (const func of functions) {
        if (func.define.end.row < curRow) {
            preFunc = func;
        }
        if (!nextFunc && func.define.start.row > curRow) {
            nextFunc = func;
            break;
        }

        if (func.define.start.row <= curRow && curRow <= func.define.end.row) {
            curFunc = func;
        }
    }

    // disable collapse ranges
    let disableCollapseRanges: FunctionRange[] = [];
    if (!curFunc) {
        if (preFunc) {
            disableCollapseRanges.push(preFunc);
        } else if (nextFunc) {
            disableCollapseRanges.push(nextFunc);
        }
    } else {
        disableCollapseRanges.push(curFunc);
        const funcLines = curFunc.define.end.row - curFunc.define.start.row + 1;
        if (funcLines < 5) {
            if (preFunc) {
                disableCollapseRanges.push(preFunc);
            } else if (nextFunc) {
                disableCollapseRanges.push(nextFunc);
            }
        }
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
        // if (curRow >= funcDefine.start.row && curRow <= func.define.end.row) {
        //     continue;
        // }
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

        // 更新光标位置
        if (curRow > bodyEndLine) {
            newCurRow -= bodyEndLine - bodyStartLine;
        }
    }

    // create prefix and suffix, prefix is the code before the cursor, suffix is the code after the cursor
    // handle newCurRow and newCurColumn
    const prefix = lines.slice(0, newCurRow).join("\n") + "\n" + lines[newCurRow].slice(0, newCurColumn);
    const suffix = lines[newCurRow].slice(newCurColumn) + "\n" + lines.slice(newCurRow+1).join("\n");

    return {prefix, suffix};
}

// 尽量获取一个完整的代码片段作为代码补全的上下文
// 解析AST是一个好的方法，但还是会有点偏重计算。先尝试通过缩进来定位合适的块。
// 整体范围保持在30行代码以内。
async function curfilePrompt(filePath: string, fileContent: string, line: number, column: number) {
    // 以line, column为中心，向前后扩展, 按行找出符合PREFIX_MAX_SIZE， SUFFIX_MAX_SIZE长度显示的prefix, suffix
    // 分割文件内容为行数组
    const lines = fileContent.split('\n');

    // 初始化prefix和suffix内容及长度
    let prefix = '';
    let suffix = '';
    let prefixTokenCount = 0;
    let suffixTokenCount = 0;

    // 从光标所在行开始，向上构建前缀
    for (let i = line; i >= 0; i--) {
        let lineText: string = lines[i] + '\n';
        if (i === line) {
            lineText = lines[i].substring(0, column);
        }

        const lineTokenCount = countTokens(lineText);
        if (prefixTokenCount + lineTokenCount >  CONTEXT_LIMITED_SIZE*0.7*0.35) {
            break;
        }

        prefix = lineText + prefix;
        prefixTokenCount += lineTokenCount;
    }

    // 从光标所在行下一行开始，向下构建后缀
    const suffixMaxToken = CONTEXT_LIMITED_SIZE*0.35 - prefixTokenCount;
    for (let i = line; i < lines.length; i++) {
        let lineText = lines[i] + '\n';
        if (i === line) {
            lineText = lines[i].substring(column, lines[i].length) + '\n';
        }

        const lineTokenCount = countTokens(lineText);
        if (suffixTokenCount + lineTokenCount > suffixMaxToken) {
            break;
        }

        suffix += lineText;
        suffixTokenCount += lineTokenCount;
    }

    // 返回前缀和后缀
    return {
        prefix,
        suffix
    };
}

async function createRecentEditContext(recentEdits: RecentEdit[], curFile: string) {
    // read last 3 edits in reverse order
    const recentEditFiles: RecentEdit[] = [...recentEdits, ...GitDiffWatcher.getInstance().getGitAddedFiles() as RecentEdit[]];
    let edits: RecentEdit[] = [];
    for (let i = recentEditFiles.length - 1; i >= 0 && edits.length < 6; i--) {
        if (recentEditFiles[i].fileName === curFile) {
            continue;
        }
        if (edits.find( (edit) => edit.fileName === recentEditFiles[i].fileName)) {
            continue;
        }
        if (recentEditFiles[i].collapseContent === "") {
            continue;
        }

        const lines = recentEditFiles[i].collapseContent.split("\n");
        // 判断不为空的代码行是否超过50行
        const filterEmptyLines = lines.filter(line => line.trim() !== "");
        if (filterEmptyLines.length > 50) {
            continue;
        }

        edits.push(recentEditFiles[i]);
    }

    let context = "";
    for (const edit of edits) {
        const commentPrefix = await getCommentPrefix(edit.fileName);
        context += `${commentPrefix}<filename>recent edit documents:\n\n ${edit.fileName}\n\n`;
        context += `${edit.collapseContent}\n\n\n\n`;
    }

    return context;
}

// find all related symbol defines
export async function symbolDefinesContext(filePath: string, fileContent: string, line: number, column: number) : Promise < { filepath: string, node: Parser.SyntaxNode, codeblock: string }[] > {
    const workspacePath = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspacePath) {
        return [];
    }
    
    // parse filepath
    const ast = await getAst(filePath, fileContent);
    if (!ast) {
        return [];
    }

    const lang = await getLanguageForFile(filePath);
    if (!lang) {
        return [];
    }

    const querySource = await getQueryVariablesSource(filePath);
    if (!querySource) {
        return [];
    }

    try {
        const extension = filePath.split('.').pop() || '';
        let query: Parser.Query | undefined = variableCache.get(extension);
        if (!query) {
            query = lang?.query(querySource);
            variableCache.set(extension, query);
        }
        const matches = query?.matches(ast.rootNode);
        if (!matches) {
            return [];
        }

        const functions = await findFunctionRanges(filePath, ast.rootNode);
        // remove function that contain line, column
        let filteredFunctions = functions.filter(f => {
            return!(f.define.start.row <= line && f.define.end.row >= line);
        });
        // remove function with name __init__ and constructor
        filteredFunctions = filteredFunctions.filter(f => {
            return f.name!== '__init__' && f.name!== 'constructor';
        });

        // collect matched ast nodes
        const importTypeNodes: Parser.SyntaxNode[] = [];
        const variableNodes: Parser.SyntaxNode[] = [];
        matches.forEach(m => {
            for (const capture of m.captures) {
                const node = capture.node;
                if (capture.name === 'import.type') {
                    importTypeNodes.push(node);
                } else if (capture.name === 'variable') {
                    variableNodes.push(node);
                }
            }
        });

        // add identifiers in lines [curline - 3: curline]
        const fromLine = line - 3 >= 0 ? line - 3 : 0;
        variableNodes.push(...await findIdentifiersInAstNodeRange(ast.rootNode, fromLine, line));

        // remove matched nodes in functions
        const filteredImportTypeNodes = importTypeNodes.filter(n => {
            return!filteredFunctions.some(f => {
                return f.define.start.row <= n.startPosition.row && f.define.end.row >= n.endPosition.row;
            });
        });
        const filteredVariableNodes = variableNodes.filter(n => {
            return!filteredFunctions.some(f => {
                return f.define.start.row <= n.startPosition.row && f.define.end.row >= n.endPosition.row;
            });
        });

        let codeblocks: { filepath: string, node: Parser.SyntaxNode, codeblock: string }[] = [];

        let codeblockRanges: { filepath: string; range: AstRange, node: Parser.SyntaxNode }[] = [];
        // for (const node of filteredImportTypeNodes) {
        //     codeblockRanges.push( ...await getDefinitions(node.startPosition.row, node.startPosition.column, filePath));
        // }
        for (const node of filteredVariableNodes) {
            const defs = await getTypeDefinitions(node.startPosition.row, node.startPosition.column, filePath);
            if (defs.length === 0) {
                continue;
            }
            // add node to defs
            for (const defV of defs) {
                codeblockRanges.push({
                    filepath: defV.filepath,
                    range: defV.range,
                    node: node
                });
            }
        }

        // remove codeblock ranges that not in workspacePath
        codeblockRanges = codeblockRanges.filter(r => {
            return r.filepath.indexOf(workspacePath) === 0;
        });

        // remove codeblock defined in node_modules
        codeblockRanges = codeblockRanges.filter(r => {
            return r.filepath.indexOf('node_modules') === -1;
        });

        // 按文件对codeblockRanges分组
        const codeblockRangesByFile: { [key: string]: { filepath: string; range: AstRange, node: Parser.SyntaxNode }[] } = {};
        for (const range of codeblockRanges) {
            if (!codeblockRangesByFile[range.filepath]) {
                codeblockRangesByFile[range.filepath] = [];
            }
            codeblockRangesByFile[range.filepath].push(range);
        }

        // 按文件获取codeblock
        for (const filepath in codeblockRangesByFile) {
            if (filepath === filePath) {
                continue;
            }

            const refContents = await readFileByVSCode(filepath);
            if (!refContents) {
                continue;
            }

            let refAst : Parser.Tree | undefined = undefined;

            const refLines = refContents.split('\n');

            let contents: {node: Parser.SyntaxNode, text: string}[] = [];
            let visitedBlockContents: string[] = [];
            for (const range of codeblockRangesByFile[filepath]) {
                if (!refAst) {
                    refAst = await getAst(filepath, refContents);
                    if (!refAst) {
                        break;
                    }
                }

                const mapKey = `${filepath}-${refLines[range.range.start.line]}-${range.range.start.line}-${range.range.start.character}`;
                if (symbleCollapsedDefine.has(mapKey)) {
                    const collapsedDefine = symbleCollapsedDefine.get(mapKey);
                    if (collapsedDefine && !visitedBlockContents.includes(collapsedDefine)) {
                        visitedBlockContents.push(collapsedDefine);
                        contents.push({node: range.node, text: collapsedDefine});
                        continue;
                    }
                }

                const blockNode = await getAstNodeByRange(refAst, range.range.start.line, range.range.start.character);
                if (!blockNode) {
                    continue;
                }

                const blockText = blockNode.text;
                if (visitedBlockContents.includes(blockText)) {
                    continue;
                }
                visitedBlockContents.push(blockText);
                symbleCollapsedDefine.set(mapKey, blockText);

                contents.push({node: range.node, text: blockText});
            }
            
            for (const content of contents) {
                // parse content and make collapse
                if (content.text.trim().split("\n").length === 1) {
                    continue;
                }

                const collapseContent = await collapseFile(filepath, content.text);
                if (collapseContent) {
                    codeblocks.push({ filepath, node:content.node, codeblock: collapseContent });
                }
            }
        }

        return codeblocks;
    } catch (e) {
        return [];
    }

    return [];
}

export async function createContextCallDefine( filepath: string, fileContent: string, posOffset: number ) : Promise < { filepath: string, codeblock: string }[] >  {
    let defs = await getDefinitionsFromLsp(
        filepath,
        fileContent,
        posOffset
    );

    const workspacePath = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspacePath) {
        return [];
    }

    defs = defs.filter(r => {
        return r.filepath.indexOf(workspacePath) === 0;
    });

    // remove codeblock ranges that in node_modules
    defs = defs.filter(r => {
        return r.filepath.indexOf(path.join(workspacePath, 'node_modules'))!== 0;
    });

    // remove codeblock same as current file
    defs = defs.filter(r => {
        return r.filepath !== filepath;
    });

    // remove contents only oneline
    defs = defs.filter(r => {
        return r.range.start.line !== r.range.end.line;
    });

    let codeblocks: { filepath: string, codeblock: string }[] = [];
    for (const cdef of defs) {
        const collapseContent = await collapseFile(filepath, cdef.contents);
        if (collapseContent) {
            codeblocks.push({ filepath, codeblock: collapseContent });
        }
    }

    return codeblocks;
}

export async function findSimilarCodeBlock(filePath: string, fileContent: string, line: number, column: number) : Promise< {file: string, text: string}[] > {
    return await searchSimilarBlock(filePath, fileContent, line, 2);
}

export async function findNeighborFileContext(filePath: string, fileContent: string, line: number, column: number): Promise<{ file: string; text: string }[]> {
    const dir = path.dirname(filePath);
    const files = await fs.readdir(dir);
    
    let smallestFile = { path: "", size: Infinity };
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === path.basename(filePath)) {
            continue;
        }

        try {
            const stats = await fs.stat(fullPath);
            // 在遍历过程中直接更新最小文件的信息
            if (stats.isFile() && stats.size < smallestFile.size) {
                smallestFile = { path: fullPath, size: stats.size };
            }
        } catch (error) {
            return [];
        }
    }
    
    if (smallestFile.size === Infinity) {
        // 如果没有找到任何文件，返回空数组
        return [];
    }
    
    // 读取最小文件的内容
    try {
        const smallestFileContent = await fs.readFile(smallestFile.path, { encoding: 'utf8' });
        // 返回包含最小文件路径和内容的对象
        return [{ file: smallestFile.path, text: smallestFileContent }];
    } catch (error) {
        console.error(`Error reading file ${smallestFile.path}:`, error);
        return [];
    }
}

// create code task description as code completion context
export async function createTaskDescriptionContext() {
    // task description is store in <WORKSPACEDIR>/.chat/complete.config, this config file 
    // is store as JSON format, and task description is store in "taskDescription" field as string
    const workspacePath = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspacePath) {
        return "";
    }

    const completeConfigPath = path.join(workspacePath, '.chat', 'complete.config');
    if (!fsF.existsSync(completeConfigPath)) {
        return "";
    }

    const completeConfig = JSON.parse(fsF.readFileSync(completeConfigPath, { encoding: 'utf8' }));
    if (!completeConfig.taskDescription) {
        return "";
    }

    return completeConfig.taskDescription;
}

export async function createPrompt(filePath: string, fileContent: string, line: number, column: number, posoffset: number, recentEdits: RecentEdit[]) {
    const commentPrefix = await getCommentPrefix(filePath);

    let { prefix, suffix } = await currentFileContext(filePath, fileContent, line, column);
    
    let tokenCount = countTokens(prefix);

    const suffixTokenCount = countTokens(suffix);
    if (tokenCount + suffixTokenCount < CONTEXT_LIMITED_SIZE) {
        tokenCount += suffixTokenCount;
    } else {
        suffix = "";
    }

    let taskDescriptionContextWithCommentPrefix = "";
    if (tokenCount < CONTEXT_LIMITED_SIZE) {
        const taskDescriptionContext = await createTaskDescriptionContext();
        if (taskDescriptionContext) {
            taskDescriptionContext.split("\n").forEach(line => {
                taskDescriptionContextWithCommentPrefix += `${commentPrefix}<filename>task: ${line}\n`;
            });

            taskDescriptionContextWithCommentPrefix += "\n\n\n\n";
        }

        const taskDescriptionContextToken = countTokens(taskDescriptionContextWithCommentPrefix);
        if (tokenCount + taskDescriptionContextToken < CONTEXT_LIMITED_SIZE) {
            tokenCount += taskDescriptionContextToken;
        } else {
            taskDescriptionContextWithCommentPrefix = "";
        }
    }

    // let gitDiffContext = GitDiffWatcher.getInstance().getGitDiffResult();
    // if (tokenCount < CONTEXT_LIMITED_SIZE && gitDiffContext.length > 0) {
    //     const gitDiffContextToken = countTokens(gitDiffContext);
    //     if (tokenCount + gitDiffContextToken < CONTEXT_LIMITED_SIZE) {
    //         tokenCount += gitDiffContextToken;
    //         gitDiffContext = "<git_diff_start>" + gitDiffContext + "<git_diff_end>\n\n\n\n";
    //     } else {
    //         gitDiffContext = "";
    //     }
    // }
    let gitDiffContext = "";

    let callDefContext = "";
    if (tokenCount < CONTEXT_LIMITED_SIZE) {
        const callCodeBlocks = await createContextCallDefine(filePath, fileContent, posoffset);
        for (const callCodeBlock of callCodeBlocks) {
            const callBlockToken = countTokens(callCodeBlock.codeblock);
            if (tokenCount + callBlockToken > CONTEXT_LIMITED_SIZE) {
                break;
            }

            tokenCount += callBlockToken;
            callDefContext += `${commentPrefix}<filename>call function define:\n\n ${callCodeBlock.filepath}\n\n`;
            callDefContext += `${callCodeBlock.codeblock}\n\n\n\n`;
        }
    }

    let similarBlockContext = "";
    if (tokenCount < CONTEXT_LIMITED_SIZE) {
        let similarTokens = 0;
        const similarContexts: {file: string, text: string}[] = await findSimilarCodeBlock(filePath, fileContent, line, column);

        for (const similarContext of similarContexts) {
            const blockToken = countTokens(similarContext.text);
            if (tokenCount + blockToken > CONTEXT_LIMITED_SIZE) {
                continue;
            }
            similarTokens += blockToken;
            if (similarTokens > CONTEXT_SIMILAR_LIMITED_SIZE) {
                continue;
            }

            tokenCount += blockToken;
            similarBlockContext += `${commentPrefix}<filename>similar blocks:\n\n ${similarContext.file}\n\n`;
            similarBlockContext += `${similarContext.text}\n\n\n\n`;
        }
    }

    let symbolContext = "";
    if (tokenCount < CONTEXT_LIMITED_SIZE) {
        const symbolDefines: { filepath: string, node: Parser.SyntaxNode, codeblock: string }[] = await symbolDefinesContext(filePath, fileContent, line, column);
        for (const symbolDefine of symbolDefines ) {
            const countSymboleToken = countTokens(symbolDefine.codeblock);
            if (tokenCount + countSymboleToken > CONTEXT_LIMITED_SIZE) {
                break;
            }

            tokenCount += countSymboleToken;
            symbolContext += `${commentPrefix}<filename>symbol defines:\n\n ${symbolDefine.filepath}\n\n`;
            symbolContext += `${commentPrefix}this is type of variable: ${symbolDefine.node.text}\n\n`;
            symbolContext += `${symbolDefine.codeblock}\n\n\n\n`;
        }
    }

    let recentEditContext = "";
    if (tokenCount < CONTEXT_LIMITED_SIZE) {
        recentEditContext = await createRecentEditContext(recentEdits, filePath);

        const countRecentToken = countTokens(recentEditContext);
        if (tokenCount + countRecentToken < CONTEXT_LIMITED_SIZE) {
            tokenCount += countRecentToken;
        } else {
            recentEditContext = "";
        }
    }

    let neighborFileContext = "";
    if (tokenCount < 200) {
        const neighborFiles = await findNeighborFileContext(filePath, fileContent, line, column);
        if (neighborFiles.length > 0) {
            const countFileToken = countTokens(neighborFiles[0].text);
            if (tokenCount + countFileToken < CONTEXT_LIMITED_SIZE) {
                tokenCount += countFileToken;
                neighborFileContext += `${commentPrefix}<filename>neighbor files:\n\n ${neighborFiles[0].file}\n\n`;
                neighborFileContext += `${neighborFiles[0].text}\n\n\n\n`;
            }
        }
    }
    
    logger.channel()?.debug("Complete token:", tokenCount);
    
    let prompt = "";
    let completeModel: string = DevChatConfig.getInstance().get("complete_model");
    if (!completeModel) {
        completeModel = "nvidia/starcoder2:15b";
    }
    if (completeModel.indexOf("deepseek") > -1) {
        prompt = "<｜fim▁begin｜>" + taskDescriptionContextWithCommentPrefix + neighborFileContext + recentEditContext + symbolContext + callDefContext + similarBlockContext + gitDiffContext + `${commentPrefix}<filename>${filePath}\n\n` + prefix + "<｜fim▁hole｜>" + suffix + "<｜fim▁end｜>";
    } else if (completeModel.indexOf("starcoder") > -1) {
        prompt = "<fim_prefix>" + taskDescriptionContextWithCommentPrefix + neighborFileContext + recentEditContext + symbolContext + callDefContext + similarBlockContext + gitDiffContext + `${commentPrefix}<filename>${filePath}\n\n` + prefix + "<fim_suffix>" + suffix + "<fim_middle>";
    } else if (completeModel.indexOf("codestral") > -1) {
        prompt = "<s>[SUFFIX]" + suffix + "[PREFIX]" + taskDescriptionContextWithCommentPrefix + neighborFileContext + recentEditContext + symbolContext + callDefContext + similarBlockContext + gitDiffContext + `${commentPrefix}<filename>${filePath}\n\n` + prefix;
    } else {
        prompt = "<fim_prefix>" + taskDescriptionContextWithCommentPrefix + neighborFileContext + recentEditContext + symbolContext + callDefContext + similarBlockContext + gitDiffContext + `${commentPrefix}<filename>${filePath}\n\n` + prefix + "<fim_suffix>" + suffix + "<fim_middle>";
    }
    
    return prompt;
}

function findImportTypeDefine(filePath: string, fileContent: string, node: Parser.SyntaxNode) {
    throw new Error("Function not implemented.");
}
