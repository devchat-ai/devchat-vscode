
import * as vscode from 'vscode';

import { Action } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import * as path from 'path';
import { UiUtilWrapper } from '../util/uiUtil';


export class SymbolInFileAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

	constructor() {
		this.name = 'symbol_in_file';
		this.description = 'Retrieve definitions in file';
		this.type = ['symbol'];
		this.action = 'symbol_ref';
		this.handler = [];
		this.args = [
			{
				"name": "file", 
				"description": 'Specify which file to load.', 
				"type": "string", 
				"required": true,
				"from": "content.content.file"
			}
		];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			let symbolFile = args.file;

			// if symbolFile is not absolute path, then get it's absolute path
			if (!path.isAbsolute(symbolFile)) {
				const basePath = UiUtilWrapper.workspaceFoldersFirstPath();
				symbolFile = path.join(basePath!, symbolFile);
			}

			// load symbols in file
			const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				vscode.Uri.file(symbolFile)
			);
			let symbolsList: vscode.DocumentSymbol[] = [];
			const visitSymbol = (symbol: vscode.DocumentSymbol) => {
				symbolsList.push(symbol);
				for (const child of symbol.children) {
					visitSymbol(child);
				}
			}
			for (const symbol of symbolsT) {
				visitSymbol(symbol);
			}

			// convert symbolsList to json object list

			let sysbolsOjbs: {[key: string]: any}[] = [];
			symbolsList.forEach(symbol => {
				sysbolsOjbs.push({
					"name": symbol.name,
					"kind": vscode.SymbolKind[symbol.kind],
					"startPosition": {
						"line": symbol.range.start.line,
						"column": symbol.range.start.character
					},
					"endPosition": {
						"line": symbol.range.end.line,
						"column": symbol.range.end.character
					},
					"selectRangeStartPosition": {
						"line": symbol.selectionRange.start.line,
						"column": symbol.selectionRange.start.character
					},
					"selectRangeEndPosition": {
						"line": symbol.selectionRange.end.line,
						"column": symbol.selectionRange.end.character
					}
				});
			});
			
			return {exitCode: 0, stdout: JSON.stringify(sysbolsOjbs), stderr: ""};
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};