
import * as vscode from 'vscode';

import { Action, CustomActions } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import { handleCodeSelected } from '../context/contextCodeSelected';


async function findSymbolInWorkspace(symbolName: string, symbolType: string, symbolFile: string): Promise<string[]> {
	// const workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
	// 	'vscode.executeWorkspaceSymbolProvider',
	// 	symbolName
	// );
	
	// let refList: string[] = [];
	// for (const symbol of workspaceSymbols) {
	// 	const refLocationFile = symbol.location.uri.fsPath;

	// 	const documentNew = await vscode.workspace.openTextDocument(refLocationFile);
	// 	const rangeNew = new vscode.Range(symbol.location.range.start.line, 0, symbol.location.range.end.line + 4, 10000);
		
	// 	const data = {
	// 		path: refLocationFile,
	// 		start_line: symbol.location.range.start.line,
	// 		content: documentNew.getText(rangeNew)
	// 	};
	// 	refList.push( JSON.stringify(data) );
	// }
	// return refList;
	
	
	// 通过vscode.commands.executeCommand执行相关命令，获取当前工作区中对应的符号定义信息
	const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
		'vscode.executeWorkspaceSymbolProvider', 
		symbolName
	);

	if (!(symbols && symbols.length > 0)) {
		return [];
	}

	// handle symbol in symbols
	let contextList: Set<string> = new Set();

	for (const symbol of symbols) {
		if (symbol.name !== symbolName) {
			continue;
		}
		if (symbolType &&  symbol.kind !== (<any>vscode.SymbolKind)[symbolType]) {
			continue;
		}
		if (symbolFile && symbol.location.uri.fsPath.endsWith(symbolFile)) {
			continue;
		}
		
		// get all references of symbol
		const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeReferenceProvider',
			symbol.location.uri,
			symbol.location.range.start
		);

		// get related source lines
		for (const refLocation of refLocations) {
			const refLocationFile = refLocation.uri.fsPath;

			const documentNew = await vscode.workspace.openTextDocument(refLocationFile);
			const rangeNew = new vscode.Range(refLocation.range.start.line, 0, refLocation.range.end.line + 4, 10000);
			
			const data = {
				path: refLocationFile,
				start_line: refLocation.range.start.line,
				content: documentNew.getText(rangeNew)
			};
			contextList.add(JSON.stringify(data));
		}
	}

	return Array.from(contextList);
}
export class SymbolRefAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "from": string }[];

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
				"from": "content.content.symbol"
			}, {
				"name": "type", 
				"description": 'Symbol type. value is one of ["File", "Module", "Namespace", "Package", "Class", "Method","Property","Field","Constructor","Enum","Interface","Function","Variable","Constant","String","Number","Boolean","Array","Object","Key","Null","EnumMember","Struct","Event","Operator","TypeParameter"]', 
				"type": "string", 
				"from": "content.content.type"
			}, {
				"name": "file", 
				"description": 'File contain that symbol. This field is not required.', 
				"type": "string", 
				"from": "content.content.file"
			}
		];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const symbolName = args.symbol;
			const symbolType = args.type;
			const symbolFile = args.file;

			// get reference information
			const refList = await findSymbolInWorkspace(symbolName, symbolType, symbolFile);

			return {exitCode: 0, stdout: JSON.stringify(refList), stderr: ""};
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};