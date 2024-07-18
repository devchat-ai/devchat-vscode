import { applyCodeWithDiff, applyEditCodeWithDiff } from "../../handler/diffHandler";
import * as vscode from 'vscode';

export namespace UnofficialEndpoints {
    export async function diffApply(filepath: string, content: string, autoedit: boolean = false) {
        if (autoedit) {
            applyEditCodeWithDiff({ fileName: filepath, content: content }, undefined)
        } else {
            applyCodeWithDiff({ fileName: filepath, content: content }, undefined);
        }
        return true;
    }

	export async function runCode(code: string) {
		// run code
		// delcare use vscode
		const vscode = require('vscode');
		const evalCode = `(async () => { ${code} })();`;
		const res = eval(evalCode);
		return res;
	}

    export async function selectRange(fileName: string, startLine: number, startColumn: number, endLine: number, endColumn: number) {
        let editor = vscode.window.activeTextEditor;
        
        // If the file is not open or not the active editor, open it
        if (!editor || editor.document.fileName !== fileName) {
            const document = await vscode.workspace.openTextDocument(fileName);
            editor = await vscode.window.showTextDocument(document);
        }
        
        if (editor) {
            if (startLine === -1) {
                // Cancel selection
                editor.selection = new vscode.Selection(editor.selection.active, editor.selection.active);
            } else {
                // Select range
                const selection = new vscode.Selection(
                    new vscode.Position(startLine, startColumn),
                    new vscode.Position(endLine, endColumn)
                );
                editor.selection = selection;
                
                // Reveal the selection
                editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
            }
            return true;
        }
        return false;
    }
}
