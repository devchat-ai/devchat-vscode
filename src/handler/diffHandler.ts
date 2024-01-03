import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

import { createTempSubdirectory } from '../util/commonUtil';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { applyCodeChanges, isValidActionString } from '../util/appyDiff';
import { logger } from '../util/logger';
import { FilePairManager } from '../util/diffFilePairs';
import { UiUtilWrapper } from '../util/uiUtil';



async function getDocumentText(): Promise<{ text: string; beforSelect: string; select: string, afterSelect: string } | undefined> {
	const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

	if (validVisibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
		return undefined;
	}

	const editor = validVisibleTextEditors[0];
	if (!editor) {
		return undefined;
	}

	// get whole text in editor
	const text = editor.document.getText();

	const selectedText = editor.document.getText(editor.selection);

	const textBeforeSelection = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), editor.selection.start));
	const textAfterSelection = editor.document.getText(new vscode.Range(editor.selection.end, new vscode.Position(editor.document.lineCount, 0)));

	// return multiple values
	return { text, beforSelect: textBeforeSelection, select: selectedText, afterSelect: textAfterSelection };
}

export async function diffView(code: string, tarFile: string) {
	let curFile = '';
	if (!tarFile) {
		const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

		if (validVisibleTextEditors.length > 1) {
			vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
			return;
		}

		const editor = validVisibleTextEditors[0];
		if (!editor) {
			return;
		}

		curFile = editor.document.fileName;
	} else {
		curFile = tarFile;
	}
	
	// get file name from fileSelected
	const fileName = path.basename(curFile);

	// create temp directory and file
	const tempDir = await createTempSubdirectory('devchat/context');
	const tempFile = path.join(tempDir, fileName);

	// save code to temp file
	await UiUtilWrapper.writeFile(tempFile, code);

	// open diff view
	FilePairManager.getInstance().addFilePair(curFile, tempFile);
	vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(curFile), vscode.Uri.file(tempFile), 'Diff View');
}

export async function getFileContent(fileName: string): Promise<string | undefined> {
	const readFile = util.promisify(fs.readFile);
	try {
		// Read file content from fileName
		const fileContent = await readFile(fileName, 'utf-8');
		// Return the whole text in the file with name fileName
		return fileContent;
	} catch (error) {
		logger.channel()!.error(`Error reading the file ${fileName}:`, error);
		return undefined;
	}
}

async function getNewCode(message: any): Promise<string | undefined> {
	let codeTextObj: { text: string; beforSelect: string; select: string; afterSelect: string; } | undefined = undefined;
	if (message.fileName) {
		const fileContent = await getFileContent(message.fileName);
		if (!fileContent) {
			logger.channel()!.error(`Failed to read the file: ${message.fileName}`);
			return undefined;
		}

		codeTextObj = { text: fileContent!, beforSelect: fileContent, select: '', afterSelect: '' };
	} else {
		codeTextObj = await getDocumentText();
	}
	if (!codeTextObj) {
		logger.channel()!.error('No document text found.');
		return undefined;
	}

	let newCode = message.content;
	if (isValidActionString(message.content)) {
		if (codeTextObj.select) {
			const diffResult = applyCodeChanges(codeTextObj.select, message.content);
			newCode = codeTextObj.beforSelect + diffResult + codeTextObj.afterSelect;
		} else {
			newCode = applyCodeChanges(codeTextObj.text, message.content);
		}
	} else {
		// if select some text, then reconstruct the code
		if (codeTextObj.select) {
			newCode = codeTextObj.beforSelect + message.content + codeTextObj.afterSelect;
		}
	}

	return newCode;
}

regInMessage({ command: 'show_diff', content: '', fileName: '' });
export async function applyCodeWithDiff(message: any, panel: vscode.WebviewPanel | vscode.WebviewView | undefined): Promise<void> {
	const newCode = await getNewCode(message);
	if (!newCode) {
		return;
	}

	diffView(newCode, message.fileName);
	return;
}
