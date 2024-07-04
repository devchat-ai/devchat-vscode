import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';

import { createTempSubdirectory } from '../util/commonUtil';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { applyCodeChanges, isValidActionString } from '../util/appyDiff';
import { logger } from '../util/logger';
import { FilePairManager } from '../util/diffFilePairs';
import { UiUtilWrapper } from '../util/uiUtil';
import { getFileContent } from '../util/commonUtil';
import { ExtensionContextHolder } from '@/util/extensionContext';


async function getDocumentText(): Promise<{ text: string; beforSelect: string; select: string, afterSelect: string } | undefined> {
	const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

	if (validVisibleTextEditors.length > 1) {
		vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
		return undefined;
	}

	const editor = validVisibleTextEditors[0];
	if (!editor) {
		return undefined;
	}

	// get whole text in editor
	const text = editor.document.getText();

	const selectedText = editor.document.getText(editor.selection);

	const textBeforeSelection = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), editor.selection.start));
	const textAfterSelection = editor.document.getText(new vscode.Range(editor.selection.end, new vscode.Position(editor.document.lineCount, 0)));

	// return multiple values
	return { text, beforSelect: textBeforeSelection, select: selectedText, afterSelect: textAfterSelection };
}

export async function diffView(code: string, tarFile: string) {
	let curFile = '';
	if (!tarFile) {
		const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

		if (validVisibleTextEditors.length > 1) {
			vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
			return;
		}

		const editor = validVisibleTextEditors[0];
		if (!editor) {
			return;
		}

		curFile = editor.document.fileName;
	} else {
		curFile = tarFile;
	}
	
	// get file name from fileSelected
	const fileName = path.basename(curFile);

	// create temp directory and file
	const tempDir = await createTempSubdirectory('devchat/context');
	const tempFile = path.join(tempDir, fileName);

	// save code to temp file
	await UiUtilWrapper.writeFile(tempFile, code);

	// open diff view
	FilePairManager.getInstance().addFilePair(curFile, tempFile);
	vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(curFile), vscode.Uri.file(tempFile), 'Diff View');
}

async function getNewCode(message: any): Promise<string | undefined> {
	let codeTextObj: { text: string; beforSelect: string; select: string; afterSelect: string; } | undefined = undefined;
	if (message.fileName) {
		const fileContent = await getFileContent(message.fileName);
		if (!fileContent) {
			logger.channel()!.error(`Failed to read the file: ${message.fileName}`);
			return undefined;
		}

		codeTextObj = { text: fileContent!, beforSelect: fileContent, select: '', afterSelect: '' };
	} else {
		codeTextObj = await getDocumentText();
	}
	if (!codeTextObj) {
		logger.channel()!.error('No document text found.');
		return undefined;
	}

	let newCode = message.content;
	if (isValidActionString(message.content)) {
		if (codeTextObj.select) {
			const diffResult = applyCodeChanges(codeTextObj.select, message.content);
			newCode = codeTextObj.beforSelect + diffResult + codeTextObj.afterSelect;
		} else {
			newCode = applyCodeChanges(codeTextObj.text, message.content);
		}
	} else {
		// if select some text, then reconstruct the code
		if (codeTextObj.select) {
			newCode = codeTextObj.beforSelect + message.content + codeTextObj.afterSelect;
		}
	}

	return newCode;
}

function getCodeEditorPath() {
    const platform = os.platform();
    const arch = os.arch();
    
    let binaryName;
    
    if (platform === 'darwin') {
        if (arch === 'arm64') {
            binaryName = 'aarch64-apple-darwin-code_editor';
        } else if (arch === 'x64') {
            binaryName = 'x86_64-apple-darwin-code_editor';
        }
    } else if (platform === 'win32' && arch === 'x64') {
        binaryName = 'x86_64-pc-windows-msvc-code_editor.exe';
    } else if (platform === 'linux' && arch === 'x64') {
        binaryName = 'x86_64-unknown-linux-musl-code_editor';
    }
    
    if (!binaryName) {
        logger.channel()?.error(`Error: No matching binary for platform ${platform} and architecture ${arch}`);
        return undefined;
    }
    
    return path.join(UiUtilWrapper.extensionPath(), 'tools', 'code-editor', binaryName);
}

async function applyDiffToCode(message: any): Promise<string | undefined> {
    const validVisibleTextEditors = vscode.window.visibleTextEditors.filter(editor => editor.viewColumn !== undefined);

    if (validVisibleTextEditors.length > 1) {
        vscode.window.showErrorMessage(`There are more then one visible text editors. Please close all but one and try again.`);
        return undefined;
    }

    const editor = validVisibleTextEditors[0];
    if (!editor) {
        return undefined;
    }

    // get whole text in editor
    const srcCode = editor.document.getText();
    let newCode = message.content;

    // Create temporary files
    const tempDir = os.tmpdir();
    const srcTempFile = path.join(tempDir, 'temp_file_1');
    const newTempFile = path.join(tempDir, 'temp_file_2');
    const resultTempFile = path.join(tempDir, 'result_temp_file');

    try {
        // Save srcCode and newCode to temp files
        await fs.promises.writeFile(srcTempFile, srcCode);
        await fs.promises.writeFile(newTempFile, newCode);

        // Call the code_editor process
        const codeEditorPath = getCodeEditorPath();
		if (!codeEditorPath) {
			return undefined;
		}
        
        // 使用 Promise 包装 exec 调用，以获取退出码
        const execWithExitCode = () => new Promise<{ exitCode: number | null, stdout: string, stderr: string }>((resolve, reject) => {
            exec(`${codeEditorPath} ${srcTempFile} ${newTempFile} ${resultTempFile}`, (error, stdout, stderr) => {
                if (error && 'code' in error) {
                    // error 是 ExecException 类型
                    resolve({ exitCode: error.code || 1, stdout, stderr });
                } else if (error) {
                    // 其他类型的错误
                    reject(error);
                } else {
                    resolve({ exitCode: 0, stdout, stderr });
                }
            });
        });

        const { exitCode, stdout, stderr } = await execWithExitCode();

        if (exitCode !== 0) {
			logger.channel()?.error(`Error executing code_editor. Exit code: ${exitCode}. Stderr: ${stderr}`);
            return undefined;
        }

        // Read the result from the temp file
        newCode = await fs.promises.readFile(resultTempFile, 'utf-8');
    } catch (error) {
        console.error(`Error in applyDiffToCode: ${error}`);
        return undefined;
    } finally {
        // Clean up temporary files
        await Promise.all([
            fs.promises.unlink(srcTempFile).catch(() => {}),
            fs.promises.unlink(newTempFile).catch(() => {}),
            fs.promises.unlink(resultTempFile).catch(() => {})
        ]);
    }

    return newCode;
}

regInMessage({ command: 'show_diff', content: '', fileName: '' });
export async function applyCodeWithDiff(message: any, panel: vscode.WebviewPanel | vscode.WebviewView | undefined): Promise<void> {
	const newCode = await getNewCode(message);
	if (!newCode) {
		return;
	}

	diffView(newCode, message.fileName);
	return;
}

regInMessage({ command: 'apply_with_diff', content: '', fileName: '' });
export async function applyEditCodeWithDiff(message: any, panel: vscode.WebviewPanel | vscode.WebviewView | undefined): Promise<void> {
	const newCode = await applyDiffToCode(message);
	if (!newCode) {
		return;
	}

	diffView(newCode, message.fileName);
	return;
}