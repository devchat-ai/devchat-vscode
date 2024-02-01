import * as vscode from "vscode";

import { IDEService } from "../types";

/**
 * Get document symbols of a file
 *
 * @param abspath: absolute path of the file
 * @returns an array of IDEService.SymbolNode
 */
export async function getDocumentSymbols(abspath: string) {
    const documentSymbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[] | vscode.SymbolInformation[]
    >("vscode.executeDocumentSymbolProvider", vscode.Uri.file(abspath));

    const symbols: IDEService.SymbolNode[] = [];

    documentSymbols.forEach((symbol) => {
        const symbolNode = toSymbolNode(symbol);
        symbols.push(symbolNode);
    });

    return symbols;
}

/**
 * Convert vscode.DocumentSymbol or vscode.SymbolInformation to IDEService.SymbolNode recursively
 */
function toSymbolNode(
    symbol: vscode.DocumentSymbol | vscode.SymbolInformation
): IDEService.SymbolNode {
    const range = "range" in symbol ? symbol.range : symbol.location?.range;
    const start = range.start;
    const end = range.end;

    const symbolNode: IDEService.SymbolNode = {
        name: symbol.name,
        kind: vscode.SymbolKind[symbol.kind],
        range: {
            start: {
                line: start.line,
                character: start.character,
            },
            end: {
                line: end.line,
                character: end.character,
            },
        },
        children: [],
    };

    if ("children" in symbol) {
        symbol.children.forEach((child) => {
            symbolNode.children.push(toSymbolNode(child));
        });
    }

    return symbolNode;
}
