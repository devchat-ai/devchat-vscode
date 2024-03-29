import * as vscode from 'vscode';
import * as path from 'path';

import { ChatContext } from './contextManager';

import { logger } from '../util/logger';
import { handleCodeSelected } from './contextCodeSelected';
import DevChat, { ChatOptions } from '../toolwrapper/devchat';
import { UiUtilWrapper } from '../util/uiUtil';


async function getCurrentSelectText(activeEditor: vscode.TextEditor): Promise<string> {
	if (!activeEditor) {
		return "";
	}

	const document = activeEditor.document;
	const selection = activeEditor.selection;
	const selectedText = document.getText(selection);

	return selectedText;
}

// get full text in activeEditor
async function getFullText(activeEditor: vscode.TextEditor): Promise<string> {
	if (!activeEditor) {
		return "";
	}

	const document = activeEditor.document;
	return document.getText();
}

async function getUndefinedSymbols(content: string): Promise<string[] | undefined> {
	// run devchat prompt command
	const devChat = new DevChat();
	const chatOptions: ChatOptions = {};

	const onData = (partialResponse) => { };
	const newContent = `
	As a software developer skilled in code analysis, your goal is to examine and understand a provided code snippet.
	The code may include various symbols, encompassing both variables and functions.
	However, the snippet doesn't include the definitions of some of these symbols.
	Now your specific task is to identify and list all such symbols whose definitions are missing but are essential for comprehending the entire code.
	This will help in fully grasping the behavior and purpose of the code. Note that the code snippet in question could range from a few lines to a singular symbol.
	
	Response is json string, don't include any other output except the json object. The json object should be an array of strings, each string is a symbol name:
	\`\`\`json
    ["f1", "f2"]
    \`\`\`

	During this process, you cannot invoke the GPT function. The code snippet is as follows: \n\`\`\`` + content + '```';  ;

	const chatResponse = await devChat.chat(newContent, chatOptions, onData, false);
	if (chatResponse && chatResponse.response) {
		logger.channel()?.info(chatResponse.response);
	}

	// parse data in chatResponse.response
	// data format as:
	// ```json {data} ```
	// or [data]
	// or plain text
	// so, parse data between ```json and ``` or directly parse the array, or return an empty array
	if (!chatResponse || !chatResponse.response) {
		return [];
	}

	let responseText = chatResponse.response.trim();
	let symbols: string[];

	const indexBlock = responseText.indexOf('```');
	if (indexBlock !== -1) {
		const indexJsonEnd = responseText.indexOf('```', indexBlock+3);
		if (indexJsonEnd !== -1) {
			responseText = responseText.substring(indexBlock, indexJsonEnd + 3);
		}
	}

	if (responseText.startsWith("```") && responseText.endsWith("```")) {
		const index = responseText.indexOf('[');
		responseText = responseText.substring(index, responseText.length - 3);
		try {
			symbols = JSON.parse(responseText);
		} catch (error) {
			return undefined;
		}
	} else {
		try {
			symbols = JSON.parse(responseText);
		} catch (error) {
			return undefined;
		}
	}

	logger.channel()?.info(`getUndefinedSymbols: ${chatResponse.response}`);
	return symbols;
}

function matchSymbolInline(line: string, symbol: string): number[] {
	const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	// Create a RegExp with the escaped symbol and word boundaries
	const regex = new RegExp(`\\b${escapedSymbol}\\b`, 'gu');

	// Find the match in the selected text
	const matches = [...line.matchAll(regex)];

	// If the symbol is found
	if (matches.length === 0) {
		return [];
	}

	return matches.map((match) => match.index!);
}

function getMatchedSymbolPositions(selectText: string, symbol: string): object[] {
	const lines = selectText.split('\n');
	const positions: object[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const matchedPositions = matchSymbolInline(line, symbol);
		for (const pos of matchedPositions) {
			positions.push({
				line: i,
				character: pos
			});
		}
	}
	return positions;
}

function isLocationInstance(loc: vscode.Location | vscode.LocationLink): boolean {
	try {
		return (loc as vscode.Location).uri !== undefined;
	} catch (error) {
		return false;
	}
}

async function handleCodeSelectedNoFile(fileSelected: string, codeSelected: string, startLine: number) {
    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
	const relativePath = path.relative(workspaceDir!, fileSelected);
	
	const data = {
		path: relativePath,
		startLine: startLine,
		content: codeSelected
	};
	return data;
}

async function getSymbolDefine(symbolList: string[], activeEditor: vscode.TextEditor, toFile: boolean = true): Promise<string[]> {
	const document = activeEditor!.document;
	let selection = activeEditor!.selection;
	let selectedText = document!.getText(selection);
	if (selectedText === "" && !toFile) {
		selectedText = await getFullText(activeEditor);
		selection = new vscode.Selection(0, 0, 0, 0);
	}

	let contextList: any[] = [];
	if (toFile) {
		contextList = [await handleCodeSelectedNoFile(document.uri.fsPath, selectedText, selection.start.line)];
	}
	let hasVisitedSymbols: Set<string> = new Set();
	let hasPushedSymbols: Set<string> = new Set();

	// visit each symbol in symbolList, and get it's define
	for (const symbol of symbolList) {
		logger.channel()?.info(`handle symble: ${symbol} ...`);
		// get symbol position in selectedText
		// if selectedText is "abc2+abc", symbol is "abc", then symbolPosition is 5 not 0
		// because abc2 is not a symbol
		const positions: any[] = getMatchedSymbolPositions(selectedText, symbol);

		for (const pos of positions) {
			const symbolPosition = pos.character;
			
			// if symbol is like a.b.c, then split it to a, b, c
			const symbolSplit = symbol.split(".");
			let curPosition = 0;
			for (const symbolSplitItem of symbolSplit) {
				const symbolPositionNew = symbol.indexOf(symbolSplitItem, curPosition) + symbolPosition;
				curPosition = symbolPositionNew - symbolPosition + symbolSplitItem.length;
				const newPos = new vscode.Position(pos.line + selection.start.line, (pos.line > 0 ? 0 : selection.start.character) + symbolPositionNew);
				logger.channel()?.info(`handle sub symble: ${symbolSplitItem} at ${newPos.line}:${newPos.character}`);

				try{
					// call vscode.executeDefinitionProvider
					const refLocations = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
						'vscode.executeDefinitionProvider',
						document.uri,
						newPos
					);
					if (!refLocations) {
						logger.channel()?.info(`no def location for ${symbolSplitItem} at ${newPos.line}:${newPos.character}`);
					}

					// visit each refLocation, and get it's define
					for (const refLocation of refLocations) {
						let targetUri: vscode.Uri | undefined = undefined;
						let targetRange: vscode.Range | undefined = undefined;
						
						if (isLocationInstance(refLocation)) {
							const locLocation = refLocation as vscode.Location;
							targetUri = locLocation.uri;
							targetRange = locLocation.range;
						} else {
							const locLocationLink = refLocation as vscode.LocationLink;
							targetUri = locLocationLink.targetUri;
							targetRange = locLocationLink.targetRange;
						}
						if (!targetUri ||!targetRange) {
							continue;
						}

						logger.channel()?.info(`def location: ${targetUri.fsPath} ${targetRange.start.line}:${targetRange.start.character}-${targetRange.end.line}:${targetRange.end.character}`);
						const refLocationString = targetUri.fsPath + "-" + targetRange.start.line + ":" + targetRange.start.character + "-" + targetRange.end.line + ":" + targetRange.end.character;
						if (hasVisitedSymbols.has(refLocationString)) {
							continue;
						}
						hasVisitedSymbols.add(refLocationString);

						// get defines in refLocation file
						const symbolsT: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
							'vscode.executeDocumentSymbolProvider',
							targetUri
						);

						let targetSymbol: any = undefined;
						const visitFun = (symbol: vscode.DocumentSymbol) => {
							if (targetRange!.start.isAfterOrEqual(symbol.range.start) && targetRange!.end.isBeforeOrEqual(symbol.range.end)) {
								targetSymbol = symbol;
							}

							if (targetRange!.start.isAfter(symbol.range.end) || targetRange!.end.isBefore(symbol.range.start)) {
								return;
							}

							for (const child of symbol.children) {
								visitFun(child);
							}
						};
						for (const symbol of symbolsT) {
							visitFun(symbol);
						}

						if (targetSymbol !== undefined) {
							logger.channel()?.info(`symbol define information: ${targetSymbol.name} at ${targetSymbol.location.uri.fsPath} ${targetSymbol.location.range.start.line}:${targetSymbol.location.range.start.character}-${targetSymbol.location.range.end.line}:${targetSymbol.location.range.end.character}`);
							const defLocationString = targetSymbol.location.uri.fsPath + "-" + targetSymbol.location.range.start.line + ":" + targetSymbol.location.range.start.character + "-" + targetSymbol.location.range.end.line + ":" + targetSymbol.location.range.end.character;
							if (hasPushedSymbols.has(defLocationString)) {
								continue;
							}
							hasPushedSymbols.add(defLocationString);

							const documentNew = await vscode.workspace.openTextDocument(targetUri);

							if (targetSymbol.kind === vscode.SymbolKind.Variable) {
								const renageNew = new vscode.Range(targetSymbol.range.start.line, 0, targetSymbol.range.end.line, 10000);
								if (toFile) {
									contextList.push(await handleCodeSelected(targetUri.fsPath, documentNew.getText(renageNew), targetSymbol.range.start.line));
								} else {
									contextList.push(await handleCodeSelectedNoFile(targetUri.fsPath, documentNew.getText(renageNew), targetSymbol.range.start.line));
								}
							} else {
								if (toFile) {
									contextList.push(await handleCodeSelected(targetUri.fsPath, documentNew.getText(targetSymbol.range), targetSymbol.range.start.line));
								} else {
									contextList.push(await handleCodeSelectedNoFile(targetUri.fsPath, documentNew.getText(targetSymbol.range), targetSymbol.range.start.line));
								}
							}
						}
					}
				} catch (error) {
					logger.channel()?.error(`getSymbolDefine error: ${error}`);
				}
			}
		}
	}
	return contextList;
}

export async function getSymbolDefines() {
	const activeEditor = vscode.window.activeTextEditor;
	
	if (!activeEditor) {
		logger.channel()?.error('No code selected!');
		logger.channel()?.show();
		return [];
	}
	
	let selectedText = await getCurrentSelectText(activeEditor);
	if (selectedText === "") {
		selectedText = await getFullText(activeEditor);
	}
	if (selectedText === "") {
		logger.channel()?.error(`No code selected! Current selected editor is: ${activeEditor.document.uri.fsPath}}`);
		logger.channel()?.show();
		return [];
	}
	const symbolList = await getUndefinedSymbols(selectedText);
	if (symbolList === undefined) {
		logger.channel()?.error('Failed to get symbol list!');
		logger.channel()?.show();
		return [];
	}
	const contextList = await getSymbolDefine(symbolList, activeEditor, false);
	return contextList;
}

export const refDefsContext: ChatContext = {
	name: 'symbol definitions',
	description: 'find related definitions of classes, functions, etc. in selected code',
	handler: async () => {
		const activeEditor = vscode.window.activeTextEditor;
		
		if (!activeEditor) {
			logger.channel()?.error('No code selected!');
			logger.channel()?.show();
			return [];
		}
		
		const selectedText = await getCurrentSelectText(activeEditor);
		if (selectedText === "") {
			logger.channel()?.error(`No code selected! Current selected editor is: ${activeEditor.document.uri.fsPath}}`);
			logger.channel()?.show();
			return [];
		}
		const symbolList = await getUndefinedSymbols(selectedText);
		if (symbolList === undefined) {
			logger.channel()?.error('Failed to get symbol list!');
			logger.channel()?.show();
			return [];
		}
		const contextList = await getSymbolDefine(symbolList, activeEditor);

		return contextList;
	},
};
