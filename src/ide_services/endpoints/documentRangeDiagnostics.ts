import * as vscode from 'vscode';

export async function getDiagnosticsInRange(fileName: string, startLine: number, endLine: number): Promise<string[]> {
    const document = await vscode.workspace.openTextDocument(fileName);
    const startPosition = new vscode.Position(startLine, 0);
    const endPosition = new vscode.Position(endLine, Number.MAX_VALUE);
    const range = new vscode.Range(startPosition, endPosition);
    const diagnosticsAll = vscode.languages.getDiagnostics(document.uri);

    const diagnostics = diagnosticsAll.filter(diag => range.contains(diag.range));
    return diagnostics.map(diag => { return `${diag.message} <<${diag.source??""}:${diag.code??""}>>`; });
}