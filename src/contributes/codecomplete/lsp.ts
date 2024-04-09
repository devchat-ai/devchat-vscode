// import { IDE, RangeInFile } from "core";
import { getAst, getTreePathAtCursor, RangeInFileWithContents } from "./ast/ast";
import { AutocompleteSnippet } from "./ranking";
import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { RangeInFile, readRangeInFile } from "./utils";

type GotoProviderName =
    | "vscode.executeDefinitionProvider"
    | "vscode.executeTypeDefinitionProvider"
    | "vscode.executeDeclarationProvider"
    | "vscode.executeImplementationProvider"
    | "vscode.executeReferenceProvider";
async function executeGotoProvider(
    uri: string,
    line: number,
    character: number,
    name: GotoProviderName,
): Promise<RangeInFile[]> {
    const definitions = (await vscode.commands.executeCommand(
        name,
        vscode.Uri.parse(uri),
        new vscode.Position(line, character),
    )) as any;

    // definitions have two possible types: Location[] or LocationLink[]
    let definitionResult: RangeInFile[] = [];
    for (const definition of definitions) {
        if (definition.range) {
            definitionResult.push({
                filepath: definition.uri.fsPath,
                range: definition.range,
            });
        } else if (definition.targetRange) {
            definitionResult.push({
                filepath: definition.targetUri.fsPath,
                range: definition.targetRange,
            });
        }
    }

    return definitionResult;
}

export async function getDefinitions(line: number, character: number, uri: string): Promise<RangeInFile[]> {
    return executeGotoProvider(uri, line, character, "vscode.executeDefinitionProvider");
}

// get type definitions
export async function getTypeDefinitions(line: number, character: number, uri: string): Promise<RangeInFile[]> {
    return executeGotoProvider(uri, line, character, "vscode.executeTypeDefinitionProvider");
}

async function getDefinitionsForNode(
    uri: string,
    node: Parser.SyntaxNode,
): Promise<RangeInFile[]> {
    const ranges: RangeInFile[] = [];
    switch (node.type) {
        case "call_expression":
            // function call -> function definition
            let row: number = node.startPosition.row;
            let col: number = node.startPosition.column;
            
            let foundParams: boolean = false;
            // visite children in reverse order
            for (let i = node.children.length - 1; i >= 0; i--) {
                const child = node.children[i];
                if ( foundParams ) {
                    row = child.endPosition.row;
                    col = child.endPosition.column - 1;
                    break;
                }

                const childText = child.text;
                // check if childText is like ( ... )
                if (childText.startsWith("(") && childText.endsWith(")")) {
                    foundParams = true;
                    continue;
                }
            }

            const defs = await executeGotoProvider(
                uri,
                row,
                col,
                "vscode.executeDefinitionProvider",
            );
            ranges.push(...defs);
            break;
        case "variable_declarator":
            // variable assignment -> variable definition/type
            // usages of the var that appear after the declaration
            break;
        case "impl_item":
            // impl of trait -> trait definition
            break;
        case "":
            // function definition -> implementations?
            break;
    }
    return ranges;
}

/**
 * and other stuff not directly on the path:
 * - variables defined on line above
 * ...etc...
 */

export async function getDefinitionsFromLsp(
    filepath: string,
    contents: string,
    cursorIndex: number
): Promise<AutocompleteSnippet[]> {
    const ast = await getAst(filepath, contents);
    if (!ast) {
        return [];
    }

    const treePath = await getTreePathAtCursor(ast, cursorIndex);
    if (!treePath) {
        return [];
    }

    const results: RangeInFileWithContents[] = [];
    for (const node of treePath.reverse()) {
        const definitions = await getDefinitionsForNode(filepath, node);
        results.push(
            ...(await Promise.all(
                definitions.map(async (def) => ({
                    ...def,
                    contents: await readRangeInFile(
                        def.filepath,
                        new vscode.Range(
                            new vscode.Position(
                                def.range.start.line,
                                def.range.start.character,
                            ),
                            new vscode.Position(def.range.end.line, def.range.end.character),
                        ),
                    ),
                })),
            )),
        );
    }

    return results.map((result) => ({
        ...result,
        score: 0.8,
    }));
}
