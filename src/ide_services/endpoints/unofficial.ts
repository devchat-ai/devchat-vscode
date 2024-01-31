import * as vscode from "vscode";
import { applyCodeWithDiff } from "../../handler/diffHandler";
import { getSymbolDefines } from "../../context/contextRefDefs";

import {
    convertSymbolsToPlainObjects,
    executeProviderCommand,
} from "../lsp/lsp";

export namespace UnofficialEndpoints {
    export async function visibleLines() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const visibleRanges = editor.visibleRanges;
            const visibleRange = visibleRanges[0];
            const visibleText = editor.document.getText(visibleRange);
            const filePath = editor.document.uri.fsPath;

            return {
                filePath: filePath,
                visibleText: visibleText,
                visibleRange: [visibleRange.start.line, visibleRange.end.line],
            };
        } else {
            return {
                filePath: "",
                visibleText: "",
                visibleRange: [-1, -1],
            };
        }
    }

    export async function selectedLines() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            const startLine = selection.start.line; // VS Code API uses 0-based indexing for lines
            const endLine = selection.end.line;
            const charCount = selectedText.length;
            const filePath = editor.document.uri.fsPath;

            return {
                filePath: filePath,
                selectedText: selectedText,
                selectedRange: [
                    startLine,
                    selection.start.character,
                    endLine,
                    selection.end.character,
                ],
            };
        } else {
            return {
                filePath: "",
                selectedText: "",
                selectedRange: [-1, -1, -1, -1],
            };
        }
    }

    export async function diffApply(filepath: string, content: string) {
        applyCodeWithDiff({ fileName: filepath, content: content }, undefined);
        return true;
    }

    export async function documentSymbols(abspath: string) {
        // A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.
        const documentSymbols = await vscode.commands.executeCommand<
            vscode.DocumentSymbol[] | vscode.SymbolInformation[]
        >("vscode.executeDocumentSymbolProvider", vscode.Uri.file(abspath));
        if (!documentSymbols) {
            return [];
        }

        const symbols = convertSymbolsToPlainObjects(documentSymbols);
        return symbols;
    }

    export async function workspaceSymbols(query: string) {
        // A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.
        const querySymbols = await vscode.commands.executeCommand<
            vscode.SymbolInformation[]
        >("vscode.executeWorkspaceSymbolProvider", query);
        if (!querySymbols) {
            return [];
        }

        return convertSymbolsToPlainObjects(querySymbols);
    }

    export async function findDefinition(
        abspath: string,
        line: string,
        col: string
    ) {
        return await executeProviderCommand(
            "vscode.executeDefinitionProvider",
            abspath,
            Number(line),
            Number(col)
        );
    }

    export async function findTypeDefinition(
        abspath: string,
        line: string,
        col: string
    ) {
        return await executeProviderCommand(
            "vscode.executeTypeDefinitionProvider",
            abspath,
            Number(line),
            Number(col)
        );
    }

    export async function findDeclaration(
        abspath: string,
        line: string,
        col: string
    ) {
        return await executeProviderCommand(
            "vscode.executeDeclarationProvider",
            abspath,
            Number(line),
            Number(col)
        );
    }

    export async function findImplementation(
        abspath: string,
        line: string,
        col: string
    ) {
        return await executeProviderCommand(
            "vscode.executeImplementationProvider",
            abspath,
            Number(line),
            Number(col)
        );
    }

    export async function findReference(
        abspath: string,
        line: string,
        col: string
    ) {
        return await executeProviderCommand(
            "vscode.executeReferenceProvider",
            abspath,
            Number(line),
            Number(col)
        );
    }

    export async function openFolder(folder: string) {
        // open folder by vscode
        const folderPathParsed = folder.replace("\\", "/");
        // Updated Uri.parse to Uri.file
        const folderUri = vscode.Uri.file(folderPathParsed);
        vscode.commands.executeCommand(`vscode.openFolder`, folderUri);
        return true;
    }

    export async function getSymbolDefinesInSelectedCode() {
        // find needed symbol defines in current editor document
        // return value is a list of symbol defines
        // each define has three fileds:
        // path: file path contain that symbol define
        // startLine: start line in that file
        // content: source code for symbol define
        return getSymbolDefines();
    }
}
