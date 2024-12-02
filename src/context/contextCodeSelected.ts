
import * as path from 'path';
import { createTempSubdirectory, getLanguageIdByFileName } from '../util/commonUtil';
import { UiUtilWrapper } from '../util/uiUtil';

export async function handleCodeSelected(fileSelected: string, codeSelected: string, startLine: number) {
    // get file name from fileSelected
    const fileName = path.basename(fileSelected);

    // create temp directory and file
    const tempDir = await createTempSubdirectory('devchat/context');
    const tempFile = path.join(tempDir, fileName);

    // get the language from fileSelected
    const languageId = await getLanguageIdByFileName(fileSelected);

	// get relative path of workspace
	const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    const relativePath = workspaceDir 
        ? path.relative(workspaceDir, fileSelected)
        : fileSelected;

    // convert fileContent to markdown code block with languageId and file path
    const data = {
		languageId: languageId,
		path: relativePath,
		startLine: startLine,
		content: codeSelected
	};
	const jsonData = JSON.stringify(data);

    // save markdownCodeBlock to temp file
    await UiUtilWrapper.writeFile(tempFile, jsonData);

    return `[context|${tempFile}]`;
}