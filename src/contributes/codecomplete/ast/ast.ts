import * as path from "path";
import Parser from "web-tree-sitter";
import { getParserForFile } from "./treeSitter";
import MemoryCacheManager from "../cache";
import * as crypto from 'crypto';
import { UiUtilWrapper } from "../../../util/uiUtil";



export interface RangeInFileWithContents {
    filepath: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    contents: string;
}

// cache ast results
const astCache: MemoryCacheManager = new MemoryCacheManager(30);

export async function getAst(
    filepath: string,
    fileContents: string,
    cacheEnable: boolean = true
): Promise<Parser.Tree | undefined> {
    // calulate hash for file contents, then use that hash as cache key
    const hash = crypto.createHash('sha256');
    hash.update(fileContents);
    const cacheKey = hash.digest('hex');

    const cachedAst: {ast: Parser.Tree, hash: string} = astCache.get(filepath);
    if (cachedAst && cachedAst.hash === cacheKey) {
        return cachedAst.ast;
    }

    const parser = await getParserForFile(filepath);
    if (!parser) {
        return undefined;
    }

    try {
        const ast = parser.parse(fileContents);
        if (cacheEnable) {
            astCache.set(filepath, {ast, hash: cacheKey});
        }
        return ast;
    } catch (e) {
        return undefined;
    }
}

export async function getTreePathAtCursor(
    ast: Parser.Tree,
    cursorIndex: number,
): Promise<Parser.SyntaxNode[] | undefined> {
    const path = [ast.rootNode];
    while (path[path.length - 1].childCount > 0) {
        let foundChild = false;
        for (let child of path[path.length - 1].children) {
            if (child.startIndex <= cursorIndex && child.endIndex >= cursorIndex) {
                path.push(child);
                foundChild = true;
                break;
            }
        }

        if (!foundChild) {
            break;
        }
    }

    return path;
}

export async function getAstNodeByRange( ast: Parser.Tree, line: number, character: number): Promise<Parser.SyntaxNode | undefined> {
    let node = ast.rootNode;

    if (node.childCount > 0) {
        for (let child of node.children) {
            if (child.startPosition.row <= line && child.endPosition.row >= line) {
                return child;
            }
        }
    }
    
    return undefined;
}

export async function getScopeAroundRange(
    range: RangeInFileWithContents,
): Promise<RangeInFileWithContents | undefined> {
    const ast = await getAst(range.filepath, range.contents);
    if (!ast) {
        return undefined;
    }

    const { start: s, end: e } = range.range;
    const lines = range.contents.split("\n");
    const startIndex =
        lines.slice(0, s.line).join("\n").length +
        (lines[s.line]?.slice(s.character).length ?? 0);
    const endIndex =
        lines.slice(0, e.line).join("\n").length +
        (lines[e.line]?.slice(0, e.character).length ?? 0);

    let node = ast.rootNode;
    while (node.childCount > 0) {
        let foundChild = false;
        for (let child of node.children) {
            if (child.startIndex < startIndex && child.endIndex > endIndex) {
                node = child;
                foundChild = true;
                break;
            }
        }

        if (!foundChild) {
            break;
        }
    }

    return {
        contents: node.text,
        filepath: range.filepath,
        range: {
            start: {
                line: node.startPosition.row,
                character: node.startPosition.column,
            },
            end: {
                line: node.endPosition.row,
                character: node.endPosition.column,
            },
        },
    };
}
