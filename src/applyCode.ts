const vscode = require('vscode');
import * as path from 'path';
import { createTempSubdirectory } from './commonUtil';


export async function applyCodeFile(text: string) {
    if (vscode.window.visibleTextEditors.length > 1) {
        vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
        return;
    }

    const editor = vscode.window.visibleTextEditors[0];
    if (!editor) {
      return;
    }
  
    const document = editor.document;
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );
  
    await editor.edit((editBuilder: string) => {
      editBuilder.replace(fullRange, text);
    });
  }

export async function applyCode(text: string) {
    if (vscode.window.visibleTextEditors.length > 1) {
        vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
        return;
    }

    const editor = vscode.window.visibleTextEditors[0];
    if (!editor) {
      return;
    }
  
    const selection = editor.selection;
    const start = selection.start;
    const end = selection.end;
  
    await editor.edit((editBuilder: string) => {
      editBuilder.replace(new vscode.Range(start, end), text);
    });
  }

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
