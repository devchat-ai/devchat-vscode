import * as path from 'path';

import * as vscode from 'vscode';

import { ChatContext } from './contextManager';

import { logger } from '../util/logger';
import { handleCodeSelected } from './contextCodeSelected';
import { log } from 'console';


async function getSelectedSymbol(): Promise<vscode.DocumentSymbol | undefined> {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return undefined;
	}

	const document = activeEditor.document;
	const selection = activeEditor.selection;

	const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri);
	if (!symbols) {
		return undefined;
	}

	let closestSymbol: vscode.DocumentSymbol | undefined = undefined;
	let maxCloseness = -1;

	const checkSymbol = (symbol: vscode.DocumentSymbol) => {
		if (symbol.range.start.isAfter(selection.end) || symbol.range.end.isBefore(selection.start)) {
			return;
		}

		const intersection = Math.max(-2, Math.min(selection.end.line, symbol.range.end.line) - Math.max(selection.start.line, symbol.range.start.line) + 1);
		const closeness = intersection / Math.max(selection.end.line - selection.start.line + 1, symbol.range.end.line - symbol.range.start.line + 1);
		if (closeness > maxCloseness) {
			maxCloseness = closeness;
			closestSymbol = symbol;
		}

		for (const child of symbol.children) {
			checkSymbol(child);
		}
	};

	for (const symbol of symbols) {
		checkSymbol(symbol);
	}

	return closestSymbol;
}

export const defRefsContext: ChatContext = {
	name: 'symbol references',
	description: 'find all references of selected symbol',
	handler: async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return [];
		}

		const document = activeEditor.document;

		// get all references of selected symbol define
		const selection = activeEditor.selection;
		if (selection.isEmpty) {
			logger.channel()?.error(`Error: no selected text!`);
			logger.channel()?.show();
			return [];
		}
		const symbolText = document.getText(selection);

		logger.channel()?.info(`selected text: ${document.uri} ${symbolText} ${selection.start}`);

		// 获取selectedSymbol的引用信息
		let contextList: string[] = [];
		let refLocations;
		try {
			refLocations = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeReferenceProvider',
				document.uri,
				selection.start
			);
		} catch (error) {
			logger.channel()?.error(`secretStorageGet error: ${error}`);
			return [];
		}

		if (refLocations) {
			// find symbol include refLocation symbol
			for (const refLocation of refLocations) {
				const refLocationFile = refLocation.uri.fsPath;
				const documentNew = await vscode.workspace.openTextDocument(refLocationFile);

				const startLine = refLocation.range.start.line - 2 > 0 ? refLocation.range.start.line - 2 : 0;
				const renageNew = new vscode.Range(startLine, 0, refLocation.range.end.line + 2, 10000);
				contextList.push(await handleCodeSelected(refLocationFile, documentNew.getText(renageNew), startLine));
			}
		} else {
			logger.channel()?.info(`no reference found!`);
		}
		return contextList;
	}
};
