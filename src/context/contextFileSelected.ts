
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createTempSubdirectory, getLanguageIdByFileName } from '../util/commonUtil';

export async function handleFileSelected(fileSelected: string) {
    // get file name from fileSelected
    const fileName = path.basename(fileSelected);

    // create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // load content in fileSelected
    const fileContent = fs.readFileSync(fileSelected, 'utf-8');
    // get the language from fileSelected
    const languageId = await getLanguageIdByFileName(fileSelected);

	// get relative path of workspace
	const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	const relativePath = path.relative(workspaceDir!, fileSelected);

    // convert fileContent to markdown code block with languageId and file path
    const data = {
		languageId: languageId,
		path: relativePath,
		content: fileContent
	};
	const jsonData = JSON.stringify(data);

    // save markdownCodeBlock to temp file
    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(jsonData));

    return `[context|${tempFile}]`;
}