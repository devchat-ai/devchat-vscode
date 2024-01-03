

import * as vscode from 'vscode';

// Function to convert vscode.Range to a plain object with line and column information
export const convertRange = (range: vscode.Range | undefined): any => {
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
        end_col: range.end.character
    };
};

// Generic function to execute a provider command and convert the results to a JSON serializable format
export const executeProviderCommand = async (
    command: string,
    abspath: string,
    line: number,
    col: number
): Promise<any[]> => {
    // Create a Position object from the line and col parameters
    const position = new vscode.Position(line, col);

    // A promise that resolves to an array of Location or LocationLink instances.
    const providerResults = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
        command,
        vscode.Uri.file(abspath),
        position
    );

    if (!providerResults) {
        return [];
    }

    // Convert providerResults to a plain object array for JSON serialization
    const resultsAsJson = providerResults.map(result => {
        if ('uri' in result) {
            // Handle vscode.Location
            return {
                uri: result.uri.toString(), // Convert URI to string for JSON serialization
                range: convertRange(result.range)
            };
        } else {
            // Handle vscode.LocationLink
            return {
                originSelectionRange: result.originSelectionRange ? convertRange(result.originSelectionRange) : undefined,
                targetUri: result.targetUri.toString(), // Convert URI to string for JSON serialization
                targetRange: convertRange(result.targetRange),
                targetSelectionRange: convertRange(result.targetSelectionRange)
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
        selectionRange:  convertRange(symbol.selectionRange),
        children: symbol.children.map(convertDocumentSymbol) // Recursively convert children
    };
};

// Function to convert SymbolInformation to a plain object
const convertSymbolInformation = (symbol: vscode.SymbolInformation): any => {
    return {
        name: symbol.name,
        kind: symbol.kind,
        location: {
            uri: symbol.location.uri.toString(), // Convert URI to string for JSON serialization
            range: convertRange(symbol.location.range)
        },
        containerName: symbol.containerName
    };
};

// Generic function to convert an array of DocumentSymbol or SymbolInformation to a plain object array
export const convertSymbolsToPlainObjects = (symbols: vscode.DocumentSymbol[] | vscode.SymbolInformation[]): any[] => {
    return symbols.map(symbol => {
        if (symbol instanceof vscode.DocumentSymbol) {
            // Handle DocumentSymbol with recursive conversion
            return convertDocumentSymbol(symbol);
        } else {
            // Handle SymbolInformation
            return convertSymbolInformation(symbol);
        }
    });
};
