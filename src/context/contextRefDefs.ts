import * as path from 'path';

import * as vscode from 'vscode'

import { ChatContext } from './contextManager';
import { createTempSubdirectory, git_ls_tree, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';
import { handleCodeSelected } from './contextCodeSelected';


export const refDefsContext: ChatContext = {
  name: 'symbol definitions',
  description: 'Context of symbol definition in selected text',
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

	let contextList: string[] = [];
	for (const file of filesList) {
        try {
            const fileUri = vscode.Uri.file(file);
            const symbolsT: vscode.DocumentSymbol[]  = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                fileUri
            );
            if (symbolsT) {
				symbolsT.forEach(symbol => {
					logger.channel()?.info(`Symbol X1: ${symbol.name}, Kind: ${symbol.kind}, Range: ${symbol.range.start.line}:${symbol.range.start.character}-${symbol.range.end.line}:${symbol.range.end.character}`);
				});

				for (const symbol of symbolsT) {
					const symbolRange = symbol.selectionRange;

					const refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
						'vscode.executeReferenceProvider',
						fileUri,
						symbolRange.start
					);

					if (refLocations) {
						// 判断是否有引用处于selection范围内
						let existRef = false;
						for (const refLocation of refLocations) {
							if (refLocation.uri.fsPath === document.uri.fsPath && refLocation.range.start.isAfterOrEqual(selection.start) && refLocation.range.end.isBeforeOrEqual(selection.end)) {
								existRef = true;
								break;
							}
						}
						if (existRef) {
							const documentNew = await vscode.workspace.openTextDocument(fileUri);
							if (symbol.kind === vscode.SymbolKind.Variable) {
								const renageNew = new vscode.Range(symbol.range.start.line, 0, symbol.range.end.line, 10000);
								contextList.push(await handleCodeSelected(file, documentNew.getText(renageNew)));
							} else {
								contextList.push(await handleCodeSelected(file, documentNew.getText(symbol.range)));
							}
						}
					}
				}
            }
        } catch (e) {
            logger.channel()?.error(`Error: ${e}`);
        }
    }

	return contextList;
  },
};
