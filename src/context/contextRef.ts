
import * as vscode from 'vscode';
import * as path from 'path';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

export async function handleRefCommand(ref_command: string) {
    if (ref_command) {
		const tempDir = await createTempSubdirectory('devchat/context');
		const diff_file = path.join(tempDir, 'custom.txt');
		const result = await runCommandStringAndWriteOutput(ref_command, diff_file);
		console.log(result.exitCode);
		console.log(result.stdout);
		console.log(result.stderr);
		return `[context|${diff_file}]`;
	}

	return '';
}