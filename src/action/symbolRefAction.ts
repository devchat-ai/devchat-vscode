
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
	for (let i = symbolLine; i < lines.length; i++) {
		let lineText = lines[i];

		// Find the symbol in the line
		symbolIndex = lineText.indexOf(symbolName);
		if (symbolIndex > -1) {
			return new vscode.Position(i, symbolIndex);
		}
	}

    return undefined;
}

async function findSymbolInWorkspace(symbolName: string, symbolline: number, symbolFile: string): Promise<string[]> {
	const symbolPosition = await getSymbolPosition(symbolName, symbolline, symbolFile);
	if (!symbolPosition) {
		return [];
	}
	
	// get all references of symbol
	const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		vscode.Uri.file(symbolFile),
		symbolPosition
	);
	if (!refLocations) {
		return [];
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
		if (!symbolsT) {
			continue;
		}
		let symbolsList: vscode.DocumentSymbol[] = [];
		const visitSymbol = (symbol: vscode.DocumentSymbol) => {
			symbolsList.push(symbol);
			if (symbol.children) {
				for (const child of symbol.children) {
					visitSymbol(child);
				}
			}
		};
		for (const symbol of symbolsT) {
			visitSymbol(symbol);
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
		this.description = 'Retrieve the reference information related to the symbol';
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