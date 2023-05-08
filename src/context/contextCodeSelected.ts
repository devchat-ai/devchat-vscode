
import * as vscode from 'vscode';
import * as path from 'path';
import { createTempSubdirectory, getLanguageIdByFileName } from '../util/commonUtil';

export async function handleCodeSelected(fileSelected: string, codeSelected: string) {
    // get file name from fileSelected
    const fileName = path.basename(fileSelected);

    // create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // get the language from fileSelected
    const languageId = await getLanguageIdByFileName(fileSelected);

    // convert fileContent to markdown code block with languageId and file path
    const data = {
		languageId: languageId,
		path: fileSelected,
		content: codeSelected
	};
	const jsonData = JSON.stringify(data);

    // save markdownCodeBlock to temp file
    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(jsonData));

    return `[context|${tempFile}]`;
}