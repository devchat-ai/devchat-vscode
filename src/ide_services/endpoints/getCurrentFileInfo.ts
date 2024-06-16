import * as vscode from 'vscode';

export async function getCurrentFileInfo() {
    const fileUri = vscode.window.activeTextEditor?.document.uri;
    const filePath = fileUri?.fsPath;
    return {"path": filePath ?? ""};
}
