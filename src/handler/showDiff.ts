import * as vscode from 'vscode';
import * as path from 'path';
import { createTempSubdirectory } from '../util/commonUtil';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { applyCodeChanges, isValidActionString } from '../util/appyDiff';
import { logger } from '../util/logger';
import { FilePairManager } from '../util/diffFilePairs';



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

export  async function diffView(code: string) {
    const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

	if (validVisibleTextEditors.length > 1) {
        vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
        return;
    }

    const editor = validVisibleTextEditors[0];
    if (!editor) {
      return;
    }

	const curFile = editor.document.fileName;
	// get file name from fileSelected
    const fileName = path.basename(curFile);

	// create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // save code to temp file
    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(code));

    // open diff view
	FilePairManager.getInstance().addFilePair(curFile, tempFile);
    vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(curFile), vscode.Uri.file(tempFile), 'Diff View');
}

async function getNewCode(message: any) : Promise<string | undefined> {
	const codeTextObj = await getDocumentText();
	if (!codeTextObj) {
		logger.channel()!.error('getDocumentText failed');
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

regInMessage({command: 'show_diff', content: ''});
export async function showDiff(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const newCode = await getNewCode(message);	
	if (!newCode) {
		return;
	}

	diffView(newCode);
	return;
}

regInMessage({command: 'block_apply', content: ''});
export async function blockApply(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const newCode = await getNewCode(message);	
	if (!newCode) {
		return;
	}

	diffView(newCode);
	return;
}


