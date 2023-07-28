
import * as vscode from 'vscode';

import { Action, CustomActions } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import { handleCodeSelected } from '../context/contextCodeSelected';

import * as fs from 'fs';
import * as util from 'util';
import { UiUtilWrapper } from '../util/uiUtil';

import path from 'path';
import { getSymbolPosition } from './symbolRefAction';

const readFile = util.promisify(fs.readFile);


async function findSymbolInWorkspace(symbolName: string, symbolline: number, symbolFile: string): Promise<string[]> {
    const symbolPosition = await getSymbolPosition(symbolName, symbolline, symbolFile);
    if (!symbolPosition) {
        return [];
    }
    
    // get definition of symbol
    const refLocations = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
        'vscode.executeDefinitionProvider',
        vscode.Uri.file(symbolFile),
        symbolPosition
    );
    if (!refLocations) {
        return [];
    }
    
    // get related source lines
    const contextListPromises = refLocations.map(async (refLocation) => {
        let refLocationFile: string;
        let targetRange: vscode.Range;

        if (refLocation instanceof vscode.Location) {
            refLocationFile = refLocation.uri.fsPath;
            targetRange = refLocation.range;

            // get symbols in file
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                vscode.Uri.file(refLocationFile)
            );

            // find the smallest symbol definition that contains the target range
            let smallestSymbol: vscode.DocumentSymbol | undefined;
            for (const symbol of symbols) {
                smallestSymbol = findSmallestSymbol(symbol, targetRange, smallestSymbol);
            }

            if (smallestSymbol) {
                targetRange = smallestSymbol.range;
            }
        } else {
            refLocationFile = refLocation.targetUri.fsPath;
            targetRange = refLocation.targetRange;
        }

        const documentNew = await vscode.workspace.openTextDocument(refLocationFile);

        const data = {
            path: refLocationFile,
            start_line: targetRange.start.line,
            end_line: targetRange.end.line,
            content: documentNew.getText(targetRange)
        };
        return JSON.stringify(data);
    });

    const contextList = await Promise.all(contextListPromises);

    return contextList;
}

function findSmallestSymbol(symbol: vscode.DocumentSymbol, targetRange: vscode.Range, smallestSymbol: vscode.DocumentSymbol | undefined): vscode.DocumentSymbol | undefined {
    if (symbol.range.contains(targetRange) && 
        (!smallestSymbol || smallestSymbol.range.contains(symbol.range))) {
        smallestSymbol = symbol;
    }

    for (const child of symbol.children) {
        smallestSymbol = findSmallestSymbol(child, targetRange, smallestSymbol);
    }

    return smallestSymbol;
}

export class SymbolDefAction implements Action {
    name: string;
    description: string;
    type: string[];
    action: string;
    handler: string[];
    args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

    constructor() {
        this.name = 'symbol_def';
        this.description = `
        Function Purpose: This function retrieves the definition information for a given symbol.
        Input: The symbol should not be in string format or in 'a.b' format. To find the definition of 'a.b', simply refer to 'b'.
        Output: The function returns a dictionary with the following keys:
        'exitCode': If 'exitCode' is 0, the function execution was successful. If 'exitCode' is not 0, the function execution failed.
        'stdout': If the function executes successfully, 'stdout' is a list of JSON strings. Each JSON string contains:
        'path': The file path.
        'start_line': The start line of the content.
        'end_line': The end line of the content.
        'content': The source code related to the definition.
        'stderr': Error output if any.
        Error Handling: If the function execution fails, 'exitCode' will not be 0 and 'stderr' will contain the error information.`;
        this.type = ['symbol'];
        this.action = 'symbol_def';
        this.handler = [];
        this.args = [
            {
                "name": "symbol", 
                "description": "The symbol variable specifies the symbol for which definition information is to be retrieved.", 
                "type": "string", 
                "required": true,
                "from": "content.content.symbol"
            }, {
                "name": "line", 
                "description": 'The line variable specifies the line number of the symbol for which definition information is to be retrieved.', 
                "type": "number", 
                "required": true,
                "from": "content.content.line"
            }, {
                "name": "file", 
                "description": 'File contain that symbol.', 
                "type": "string", 
                "required": true,
                "from": "content.content.file"
            }
        ];
    }

 async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
    try {
        const symbolName = args.symbol;
        const symbolLine = args.line;
        let symbolFile = args.file;

        // Check if the symbol name is valid
        if (!symbolName || typeof symbolName !== 'string') {
            throw new Error('Invalid symbol name. It should be a non-empty string.');
        }

        // Check if the symbol line is valid
        if (!symbolLine || typeof symbolLine !== 'number' || symbolLine < 0) {
            throw new Error('Invalid symbol line. It should be a non-negative number.');
        }

        // Check if the symbol file is valid
        if (!symbolFile || typeof symbolFile !== 'string') {
            throw new Error('Invalid symbol file. It should be a non-empty string.');
        }

        // if symbolFile is not absolute path, then get it's absolute path
        if (!path.isAbsolute(symbolFile)) {
            const basePath = UiUtilWrapper.workspaceFoldersFirstPath();
            symbolFile = path.join(basePath!, symbolFile);
        }

        // get reference information
        const refList = await findSymbolInWorkspace(symbolName, symbolLine, symbolFile);

        return {exitCode: 0, stdout: JSON.stringify(refList), stderr: ""};
    } catch (error) {
        logger.channel()?.error(`${this.name} handle error: ${error}`);
        logger.channel()?.show();
        return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
    }
}
};