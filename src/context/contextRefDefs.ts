import * as path from 'path';

import * as vscode from 'vscode'

import { ChatContext } from './contextManager';
import { createTempSubdirectory, git_ls_tree, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';
import { handleCodeSelected } from './contextCodeSelected';
import DevChat, { ChatOptions } from '../toolwrapper/devchat';


async function getCurrentSelectText(): Promise<string> {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return "";
	}

	const document = activeEditor.document;
	const selection = activeEditor.selection;
	const selectedText = document.getText(selection);

	return selectedText;
}

async function getUndefinedSymbols(content: string): Promise<string[]> {
	// run devchat prompt command
	const devChat = new DevChat();
	const chatOptions: ChatOptions = {};

	const onData = (partialResponse) => { };
	const newContent = content + `\n只列出当前代码中缺少定义的符号列表，不需要其他处理。应答形式为markdown code block，例如：
	\`\`\`json
	["f1", "f2"]
	\`\`\`
	不能调用GPT function.`;

	const chatResponse = await devChat.chat(newContent, chatOptions, onData);
	if (!chatResponse.isError) {
		await devChat.delete(chatResponse['prompt-hash']);
	}

	// parse data in chatResponse.response
	// data format as:
	// ```json {data} ```
	// so, parse data between ```json and ```
	if (!chatResponse || !chatResponse.response) {
		return [];
	}
	if (!chatResponse.response.match(/```json([\s\S]*)```/)) {
		return [];
	}

	logger.channel()?.info(`getUndefinedSymbols: ${chatResponse.response}`);
	const responseText = chatResponse.response.match(/```json([\s\S]*)```/)![1];
	// parse responseText to json
	return JSON.parse(responseText);
}

async function getSymbolDefine(symbolList: string[]): Promise<string[]> {
	const activeEditor = vscode.window.activeTextEditor;
	const document = activeEditor!.document;
	const selection = activeEditor!.selection;
	const selectedText = document.getText(selection);

	let contextList: string[] = [await handleCodeSelected(activeEditor!.document.uri.fsPath, selectedText)];
	let hasVisitedSymbols: Set<string> = new Set();

	// visit each symbol in symbolList, and get it's define
	for (const symbol of symbolList) {
		// get symbol position in selectedText
		// if selectedText is "abc2+abc", symbol is "abc", then symbolPosition is 5 not 0
		// because abc2 is not a symbol
		const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Create a RegExp with the escaped symbol and word boundaries
		const regex = new RegExp(`\\b${escapedSymbol}\\b`, 'gu');

		// Find the match in the selected text
		const matches = [...selectedText.matchAll(regex)];

		// If the symbol is found
		if (matches.length === 0) {
			continue;
		}

		for (const match of matches) {
			const symbolPosition = match.index!;

			// if symbol is like a.b.c, then split it to a, b, c
			const symbolSplit = symbol.split(".");
			let curPosition = 0;
			for (const symbolSplitItem of symbolSplit) {
				const symbolPositionNew = symbol.indexOf(symbolSplitItem, curPosition) + symbolPosition;
				curPosition = symbolPositionNew - symbolPosition + symbolSplitItem.length;

				// call vscode.executeDefinitionProvider
				const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
					'vscode.executeDefinitionProvider',
					document.uri,
					selection.start.translate({ characterDelta: symbolPositionNew })
				);

				// visit each refLocation, and get it's define
				for (const refLocation of refLocations) {
					const refLocationString = refLocation.uri.fsPath + "-" + refLocation.range.start.line + ":" + refLocation.range.start.character + "-" + refLocation.range.end.line + ":" + refLocation.range.end.character;
					if (hasVisitedSymbols.has(refLocationString)) {
						continue;
					}
					hasVisitedSymbols.add(refLocationString);

					// get defines in refLocation file
					const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
						'vscode.executeDocumentSymbolProvider',
						refLocation.uri
					);

					let targetSymbol: any = undefined;
					const visitFun = (symbol: vscode.DocumentSymbol) => {
						if (refLocation.range.start.isAfterOrEqual(symbol.range.start) && refLocation.range.end.isBeforeOrEqual(symbol.range.end)) {
							targetSymbol = symbol;
						}

						if (refLocation.range.start.isAfter(symbol.range.end) || refLocation.range.end.isBefore(symbol.range.start)) {
							return;
						}

						for (const child of symbol.children) {
							visitFun(child);
						}
					}
					for (const symbol of symbolsT) {
						visitFun(symbol);
					}

					if (targetSymbol !== undefined) {
						const documentNew = await vscode.workspace.openTextDocument(refLocation.uri);

						if (targetSymbol.kind === vscode.SymbolKind.Variable) {
							const renageNew = new vscode.Range(targetSymbol.range.start.line, 0, targetSymbol.range.end.line, 10000);
							contextList.push(await handleCodeSelected(refLocation.uri.fsPath, documentNew.getText(renageNew)));
						} else {
							contextList.push(await handleCodeSelected(refLocation.uri.fsPath, documentNew.getText(targetSymbol.range)));
						}
					}
				}
			}
		}
	}
	return contextList;
}


export const refDefsContext: ChatContext = {
	name: 'symbol definitions',
	description: 'Context of symbol definition in selected text',
	handler: async () => {
		const selectedText = await getCurrentSelectText();
		const symbolList = await getUndefinedSymbols(selectedText);
		const contextList = await getSymbolDefine(symbolList);

		return contextList;
	},
};
