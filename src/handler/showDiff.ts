import * as vscode from 'vscode';
import {messageHandler} from './messageHandler';
import * as path from 'path';
import { createTempSubdirectory } from '../util/commonUtil';


export  async function diffView(code: string) {
    if (vscode.window.visibleTextEditors.length > 1) {
        vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
        return;
    }

    const editor = vscode.window.visibleTextEditors[0];
    if (!editor) {
      return;
    }

    const selectedText = editor.document.getText(editor.selection);

    const curFile = editor.document.fileName;
    
    // get file name from fileSelected
    const fileName = path.basename(curFile);

    // create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // save code to temp file
    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(code));

    if (selectedText) {
      // create temp directory and file
      const tempDir = await createTempSubdirectory('devchat/context');
      const tempSelectCodeFile = path.join(tempDir, fileName);

      // save code to temp file
      await vscode.workspace.fs.writeFile(vscode.Uri.file(tempSelectCodeFile), Buffer.from(selectedText));

      // open diff view
      vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(tempSelectCodeFile), vscode.Uri.file(tempFile), 'Diff View');
    } else {
      // open diff view
      vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(curFile), vscode.Uri.file(tempFile), 'Diff View');
    }
  }


async function showDiff(message: any, panel: vscode.WebviewPanel): Promise<void> {
	diffView(message.content);
    return;
}

async function blockApply(message: any, panel: vscode.WebviewPanel): Promise<void> {
	diffView(message.content);
    return;
}

messageHandler.registerHandler('block_apply', blockApply);
messageHandler.registerHandler('show_diff', showDiff);
