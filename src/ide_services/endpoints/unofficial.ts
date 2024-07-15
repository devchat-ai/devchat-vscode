import { applyCodeWithDiff, applyEditCodeWithDiff } from "../../handler/diffHandler";


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
}
