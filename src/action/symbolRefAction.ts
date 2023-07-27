
import * as vscode from 'vscode';

import { Action, CustomActions } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import { handleCodeSelected } from '../context/contextCodeSelected';

import * as fs from 'fs';
import * as util from 'util';
import { UiUtilWrapper } from '../util/uiUtil';
import path from 'path';

const readFile = util.promisify(fs.readFile);


async function isCorrectIndexSymbol(filename: string, position: vscode.Position, symbolName: string): Promise< boolean > {
    let defLocations = await vscode.commands.executeCommand<any[]>(
        'vscode.executeDefinitionProvider',
        vscode.Uri.file(filename),
        position
    );

    if (!defLocations || defLocations.length === 0) {
        defLocations = await vscode.commands.executeCommand<any[]>(
            'vscode.executeReferenceProvider',
            vscode.Uri.file(filename),
            position
        );
    }

    if (!defLocations) {
        return false;
    }

    for (const defLocation of defLocations) {
        let range = undefined;
        let uri = undefined;
        if (defLocation.targetSelectionRange) {
            range = defLocation.targetSelectionRange;
            uri = defLocation.targetUri;
        } else if (defLocation.targetRange) {
            range = defLocation.targetRange;
            uri = defLocation.targetUri;
        } else {
            range = defLocation.range;
            uri = defLocation.uri;
        }
        if (!range) {
            continue;
        }

        const documentNew = await vscode.workspace.openTextDocument(uri);
        const sbName = await documentNew.getText(range);
        if (sbName === symbolName) {
            return true;
        }
    }
    return false;
}

export async function getSymbolPosition(symbolName: string, symbolLine: number, symbolFile: string): Promise<vscode.Position | undefined> {
	// Read the file
    let content = await readFile(symbolFile, 'utf-8');

    // Split the content into lines
    let lines = content.split('\n');

    // Check if the line number is valid
    if (symbolLine < 0 || symbolLine >= lines.length) {
        return undefined;
    }

    // Get the line text
	let symbolIndex = -1;
	const maxLine = lines.length < symbolLine + 6 ? lines.length : symbolLine + 6;
	for (let i = symbolLine; i < maxLine; i++) {
		let lineText = lines[i];

		// Find the symbol in the line
		let lineOffsetPos = -1;
		while (true) {
			symbolIndex = lineText.indexOf(symbolName, lineOffsetPos+1);
			if (symbolIndex > -1 && await isCorrectIndexSymbol(symbolFile, new vscode.Position(i, symbolIndex), symbolName)) {
				return new vscode.Position(i, symbolIndex);
			}
			if (symbolIndex === -1) {
				break;
			}
			lineOffsetPos = symbolIndex;
		}
	}

    return undefined;
}

async function findSymbolInWorkspace(symbolName: string, symbolline: number, symbolFile: string): Promise<string[]> {
	const symbolPosition = await getSymbolPosition(symbolName, symbolline, symbolFile);
	if (!symbolPosition) {
        throw new Error(`Symbol "${symbolName}" not found in file "${symbolFile}" at line ${symbolline}.`);
    }

	logger.channel()?.info(`symbol position: ${symbolPosition.line}:${symbolPosition.character}`);

	// get all references of symbol
	const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		vscode.Uri.file(symbolFile),
		symbolPosition
	);
	if (!refLocations || refLocations.length === 0) {
        throw new Error(`No references found for symbol "${symbolName}" in file "${symbolFile}" at line ${symbolline}.`);
    }
	
	// get related source lines
	let contextList: Set<string> = new Set();
	for (const refLocation of refLocations) {
		const refLocationFile = refLocation.uri.fsPath;

		// calculate the line number, if refLocation.range.start.line - 2 < 0, then set it to 0
		const startLine = refLocation.range.start.line - 2 < 0 ? 0 : refLocation.range.start.line - 2;

		const documentNew = await vscode.workspace.openTextDocument(refLocationFile);
		const rangeNew = new vscode.Range(startLine, 0, refLocation.range.end.line + 2, 10000);
		
		// get symbol define in symbolFile
		const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			refLocation.uri
		);
		let symbolsList: vscode.DocumentSymbol[] = [];
		const visitSymbol = (symbol: vscode.DocumentSymbol) => {
			symbolsList.push(symbol);
			if (symbol.children) {
				for (const child of symbol.children) {
					visitSymbol(child);
				}
			}
		};
		if (symbolsT) {
			for (const symbol of symbolsT) {
				visitSymbol(symbol);
			}
		}
		
		let symbol: vscode.DocumentSymbol | undefined = undefined;
		for (const symbolT of symbolsList.reverse()) {
			if (symbolT.range.contains(refLocation.range)) {
				symbol = symbolT;
				break;
			}
		}

		const symbolName = symbol ? symbol.name : '';
		const symbolLine = symbol ? symbol.range.start.line : 0;

		const data = {
			path: refLocationFile,
			start_line: startLine,
			ref_line: refLocation.range.start.line,
			content: documentNew.getText(rangeNew),
			parentDefine: symbolName,
			parentDefineStartLine: symbolLine
		};
		contextList.add(JSON.stringify(data));
	}
	
	return Array.from(contextList);
}
export class SymbolRefAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

	constructor() {
		this.name = 'symbol_ref';
		this.description = `
		Function Purpose: This function retrieves the reference information for a given symbol.
		Input: The symbol should not be in string format or in 'a.b' format. To find the reference of 'a.b', simply refer to 'b'.
		Output: The function returns a dictionary with the following keys:
		'exitCode': If 'exitCode' is 0, the function execution was successful. If 'exitCode' is not 0, the function execution failed.
		'stdout': If the function executes successfully, 'stdout' is a list of JSON strings. Each JSON string contains:
		'path': The file path.
		'ref_line': The ref line of the symbol.
		'content': The source code related to the reference.
		'parentDefine': The parent symbol name of the reference, which is always a function name or class name.
		'parentDefineStartLine': The start line of the parent symbol name of the reference.
		'stderr': Error output if any.
		Error Handling: If the function execution fails, 'exitCode' will not be 0 and 'stderr' will contain the error information.`;
		this.type = ['symbol'];
		this.action = 'symbol_ref';
		this.handler = [];
		this.args = [
			{
				"name": "symbol", 
				"description": "The symbol variable specifies the symbol for which reference information is to be retrieved.", 
				"type": "string", 
				"required": true,
				"from": "content.content.symbol"
			}, {
				"name": "line", 
				"description": 'The line variable specifies the line number of the symbol for which reference information is to be retrieved.', 
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