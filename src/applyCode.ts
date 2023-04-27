const vscode = require('vscode');


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

async function applyCode(text: string) {
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

  export default applyCode;