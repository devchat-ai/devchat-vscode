
import * as vscode from 'vscode';
import * as path from 'path';
import { createTempSubdirectory, getLanguageIdByFileName } from './commonUtil';

export async function handleFileSelected(fileSelected: string) {
    // get file name from fileSelected
    const fileName = path.basename(fileSelected);

    // create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // load content in fileSelected
    const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(fileSelected));

    // get the language from fileSelected
    const languageId = await getLanguageIdByFileName(fileSelected);

    // convert fileContent to markdown code block with languageId and file path
    const markdownCodeBlock = `\`\`\`${languageId} path=${fileSelected}\n${fileContent}\n\`\`\``;

    // save markdownCodeBlock to temp file
    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(markdownCodeBlock));

    return `[context|${tempFile}]`;
}