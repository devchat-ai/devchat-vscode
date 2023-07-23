import * as path from 'path';

import * as vscode from 'vscode'

import { ChatContext } from './contextManager';
import { createTempSubdirectory, git_ls_tree, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';
import { handleCodeSelected } from './contextCodeSelected';


export const defRefsContext: ChatContext = {
  name: 'symbol references',
  description: 'The context where the selected symbol is referenced',
  handler: async () => {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return [];
	}

	const document = activeEditor.document;
	const selection = activeEditor.selection;
	const selectedText = document.getText(selection);

	// if there are no text selected, then return
	if (selectedText === "") {
		logger.channel()?.warn(`No text has been selected!`);
		return [];
	}


	const filesList = await git_ls_tree(true);

	let symbolFileMap: Map<string, vscode.DocumentSymbol[]> = new Map();
	for (const file of filesList) {
        try {
            const fileUri = vscode.Uri.file(file);
            const symbolsT: vscode.DocumentSymbol[]  = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                fileUri
            );
            if (symbolsT) {
				symbolFileMap[file] = symbolsT;
            }
        } catch (e) {
            logger.channel()?.error(`Error: ${e}`);
        }
    }


	let contextList: string[] = [];
	const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		document.uri,
		selection.start
	);

	// symbol set 
	let symbolMap: Map<String, vscode.DocumentSymbol> = new Map();

	if (refLocations) {
		// find symbol include refLocation symbol
		for (const refLocation of refLocations) {
			const refLocationFile = refLocation.uri.fsPath;
			// if symbolFileMap has refLocationFile, then find symbol include refLocation symbol
			if (symbolFileMap[refLocationFile]) {
				let existInSymbol = false;
				for (const symbol of symbolFileMap[refLocationFile]) {
					if (refLocation.range.start.isAfterOrEqual(symbol.range.start) && refLocation.range.end.isBeforeOrEqual(symbol.range.end)) {
						const symbolKey = `${refLocationFile} ${symbol.name} ${symbol.kind} ${symbol.range.start.line}:${symbol.range.start.character}-${symbol.range.end.line}:${symbol.range.end.character}`;
						// if symbolKey not in symbolMap, then add it to symbolMap
						if (!symbolMap[symbolKey]) {
							existInSymbol = true;
							symbolMap[symbolKey] = symbol;
							const documentNew = await vscode.workspace.openTextDocument(refLocationFile);

							if (symbol.kind === vscode.SymbolKind.Variable) {
								const renageNew = new vscode.Range(symbol.range.start.line, 0, symbol.range.end.line, 10000);
								contextList.push(await handleCodeSelected(refLocationFile, documentNew.getText(renageNew)));
							} else {
								contextList.push(await handleCodeSelected(refLocationFile, documentNew.getText(symbol.range)));
							}
							break;
						}
					}
				}
				
				if (existInSymbol === false) {
					const documentNew = await vscode.workspace.openTextDocument(refLocationFile);
					const renageNew = new vscode.Range(refLocation.range.start.line, 0, refLocation.range.end.line, 10000);
					contextList.push(await handleCodeSelected(refLocationFile, documentNew.getText(renageNew)));
				}
			}
		}
	}

	return contextList;
  },
};
