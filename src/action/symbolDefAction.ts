
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
	const refLocations = await vscode.commands.executeCommand<vscode.LocationLink[]>(
		'vscode.executeDefinitionProvider',
		vscode.Uri.file(symbolFile),
		symbolPosition
	);
	if (!refLocations) {
		return [];
	}
	
	// get related source lines
	let contextList: Set<string> = new Set();
	for (const refLocation of refLocations) {
		const refLocationFile = refLocation.targetUri.fsPath;
		const documentNew = await vscode.workspace.openTextDocument(refLocationFile);

		const data = {
			path: refLocation.targetUri.fsPath,
			start_line: refLocation.targetRange.start.line,
			end_line: refLocation.targetRange.end.line,
			content: documentNew.getText(refLocation.targetRange)
		};
		contextList.add(JSON.stringify(data));
		
		// // get symbol define in symbolFile
		// const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		// 	'vscode.executeDocumentSymbolProvider',
		// 	refLocation.targetUri
		// );
		// if (!symbolsT) {
		// 	continue;
		// }
		// let symbolsList: vscode.DocumentSymbol[] = [];
		// const visitSymbol = (symbol: vscode.DocumentSymbol) => {
		// 	symbolsList.push(symbol);
		// 	if (symbol.children) {
		// 		for (const child of symbol.children) {
		// 			visitSymbol(child);
		// 		}
		// 	}
		// };
		// for (const symbol of symbolsT) {
		// 	visitSymbol(symbol);
		// }
		
		// let symbol: vscode.DocumentSymbol | undefined = undefined;
		// for (const symbolT of symbolsList.reverse()) {
		// 	if (symbolT.range.contains(refLocation.) && symbolT.name === symbolName) {
		// 		symbol = symbolT;
		// 		break;
		// 	}
		// }
		// if (symbol) {
		// 	const data = {
		// 		path: refLocation.uri,
		// 		start_line: symbol.range.start.line,
		// 		content: documentNew.getText(symbol.range)
		// 	};
		// 	contextList.add(JSON.stringify(data));
		// }
	}

	return Array.from(contextList);
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
		this.description = 'Retrieve the definition of symbol.';
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