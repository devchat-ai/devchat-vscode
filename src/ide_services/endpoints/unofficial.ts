import * as vscode from "vscode";
import { applyCodeWithDiff } from "../../handler/diffHandler";
import { getSymbolDefines } from "../../context/contextRefDefs";

// Function to convert vscode.Range to a plain object with line and column information
const convertRange = (range: vscode.Range | undefined): any => {
    if (!range) {
        return {
            start_line: -1,
            start_col: -1,
            end_line: -1,
            end_col: -1,
        };
    }
    return {
        start_line: range.start.line,
        start_col: range.start.character,
        end_line: range.end.line,
        end_col: range.end.character,
    };
};

// Generic function to execute a provider command and convert the results to a JSON serializable format
const executeProviderCommand = async (
    command: string,
    abspath: string,
    line: number,
    col: number
): Promise<any[]> => {
    // Create a Position object from the line and col parameters
    const position = new vscode.Position(line, col);

    // A promise that resolves to an array of Location or LocationLink instances.
    const providerResults = await vscode.commands.executeCommand<
        (vscode.Location | vscode.LocationLink)[]
    >(command, vscode.Uri.file(abspath), position);

    if (!providerResults) {
        return [];
    }

    // Convert providerResults to a plain object array for JSON serialization
    const resultsAsJson = providerResults.map((result) => {
        if ("uri" in result) {
            // Handle vscode.Location
            return {
                uri: result.uri.toString(), // Convert URI to string for JSON serialization
                range: convertRange(result.range),
            };
        } else {
            // Handle vscode.LocationLink
            return {
                originSelectionRange: result.originSelectionRange
                    ? convertRange(result.originSelectionRange)
                    : undefined,
                targetUri: result.targetUri.toString(), // Convert URI to string for JSON serialization
                targetRange: convertRange(result.targetRange),
                targetSelectionRange: convertRange(result.targetSelectionRange),
            };
        }
    });

    return resultsAsJson;
};

// Function to recursively convert DocumentSymbol to a plain object
const convertDocumentSymbol = (symbol: vscode.DocumentSymbol): any => {
    return {
        name: symbol.name,
        kind: symbol.kind,
        detail: symbol.detail,
        range: convertRange(symbol.range),
        selectionRange: convertRange(symbol.selectionRange),
        children: symbol.children.map(convertDocumentSymbol), // Recursively convert children
    };
};

// Function to convert SymbolInformation to a plain object
const convertSymbolInformation = (symbol: vscode.SymbolInformation): any => {
    return {
        name: symbol.name,
        kind: symbol.kind,
        location: {
            uri: symbol.location.uri.toString(), // Convert URI to string for JSON serialization
            range: convertRange(symbol.location.range),
        },
        containerName: symbol.containerName,
    };
};

// Generic function to convert an array of DocumentSymbol or SymbolInformation to a plain object array
const convertSymbolsToPlainObjects = (
    symbols: vscode.DocumentSymbol[] | vscode.SymbolInformation[]
): any[] => {
    return symbols.map((symbol) => {
        if (symbol.children) {
            // Handle DocumentSymbol with recursive conversion
            return convertDocumentSymbol(symbol);
        } else {
            // Handle SymbolInformation
            return convertSymbolInformation(symbol);
        }
    });
};

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
