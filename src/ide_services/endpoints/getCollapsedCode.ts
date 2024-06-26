import { collapseFileExculdeSelectRange } from '../../contributes/codecomplete/ast/collapseBlock';
import * as vscode from 'vscode';

export async function getCollapsedCode(fileName: string, startLine: number, endLine: number): Promise<string> {
    const document = await vscode.workspace.openTextDocument(fileName);
    const startPosition = new vscode.Position(startLine, 0);
    const endPosition = new vscode.Position(endLine, Number.MAX_VALUE);
    const range = new vscode.Range(startPosition, endPosition);
    const code = await collapseFileExculdeSelectRange(document.uri.fsPath, document.getText(), range.start.line, range.end.line);
    return code;
}