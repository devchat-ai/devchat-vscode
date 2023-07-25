
import * as vscode from 'vscode';

import { Action } from './customAction';
import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import * as fs from 'fs';

export class SelectTextAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

	constructor() {
		this.name = 'select_text';
		this.description = 'Selected text in active document, only include text user selected.';
		this.type = ['None'];
		this.action = 'select_text';
		this.handler = [];
		this.args = [];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const editors = vscode.window.visibleTextEditors;
			// get editor with file existed in file system
			const editor = editors.find(editor => fs.existsSync(editor.document.fileName));


			if (editor) {
				const selectedText = editor.document.getText(editor.selection);

				const data = {
					path: editor.document.fileName,
					startLine: editor.selection.start.line,
					startColumn: editor.selection.start.character,
					endLine: editor.selection.end.line,
					endColumn: editor.selection.end.character,
					content: selectedText
				};

				return {exitCode: 0, stdout: JSON.stringify(data), stderr: ""};
			} else {
				return {exitCode: -1, stdout: "", stderr: "No active editor"};
			}
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};

export class SelectBlockAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

	constructor() {
		this.name = 'select_block';
		this.description = 'Select block in active document. For example, select a function name, then return the whole function.';
		this.type = ['None'];
		this.action = 'select_block';
		this.handler = [];
		this.args = [];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const editors = vscode.window.visibleTextEditors;
			// get editor with file existed in file system
			const editor:vscode.TextEditor | undefined = editors.find(editor => fs.existsSync(editor.document.fileName));
			if (!editor) {
				return {exitCode: -1, stdout: "", stderr: "No active editor"};
			}

			// get all symbols in active document
			const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				editor.document.uri
			);
			if (!symbolsT) {
				return {exitCode: -1, stdout: "", stderr: "No parent block found"};
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

			// visit symbolsList, and find the symbol which contains the selected text
			let symbol: vscode.DocumentSymbol | undefined = undefined;
			for (const symbolT of symbolsList.reverse()) {
				if (symbolT.range.contains(editor.selection)) {
					symbol = symbolT;
					break;
				}
			}

			if (!symbol) {
				return {exitCode: -1, stdout: "", stderr: "No parent block found"};
			}

			const data = {
				path: editor.document.fileName,
				startLine: symbol.range.start.line,
				startColumn: symbol.range.start.character,
				endLine: symbol.range.end.line,
				endColumn: symbol.range.end.character,
				content: editor.document.getText(symbol.range)
			};
			return {exitCode: 0, stdout: JSON.stringify(data), stderr: ""};
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};