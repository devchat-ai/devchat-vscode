import * as vscode from "vscode";
import { applyCodeWithDiff } from "../../handler/diffHandler";
import { getSymbolDefines } from "../../context/contextRefDefs";


export namespace UnofficialEndpoints {
    export async function diffApply(filepath: string, content: string) {
        applyCodeWithDiff({ fileName: filepath, content: content }, undefined);
        return true;
    }

    export async function getSymbolDefinesInSelectedCode() {
        // find needed symbol defines in current editor document
        // return value is a list of symbol defines
        // each define has three fileds:
        // path: file path contain that symbol define
        // startLine: start line in that file
        // content: source code for symbol define
        return getSymbolDefines();
    }

	export async function runCode(code: string) {
		// run code
		// delcare use vscode
		const vscode = require('vscode');
		const evalCode = `(async () => { ${code} })();`;
		const res = eval(evalCode);
		return res;
	}
}
