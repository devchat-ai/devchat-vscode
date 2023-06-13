
import * as path from 'path';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';
import { logger } from '../util/logger';


export async function handleRefCommand(ref_command: string) {
    if (ref_command) {
		const tempDir = await createTempSubdirectory('devchat/context');
		const diff_file = path.join(tempDir, 'custom.txt');
		
		logger.channel()?.info(`custom command: ${ref_command}`);
		const result = await runCommandStringAndWriteOutput(ref_command, diff_file);
		logger.channel()?.info(`  exit code:`, result.exitCode);

		logger.channel()?.debug(`  stdout:`, result.stdout);
		logger.channel()?.debug(`  stderr:`, result.stderr);
		return `[context|${diff_file}]`;
	}

	return '';
}