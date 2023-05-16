import * as vscode from 'vscode';
import * as path from 'path';
import { createTempSubdirectory } from '../util/commonUtil';
import { regInMessage, regOutMessage } from '../util/reg_messages';



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

regInMessage({command: 'show_diff', content: ''});
export async function showDiff(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	diffView(message.content);
    return;
}

regInMessage({command: 'block_apply', content: ''});
export async function blockApply(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	diffView(message.content);
    return;
}


