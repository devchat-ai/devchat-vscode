import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';


export const gitDiffCachedContext: ChatContext = {
  name: 'git diff --cached',
  description: 'diff for cached changes',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diff_file = path.join(tempDir, 'diff_cached.txt');
    
	logger.channel()?.info(`git diff --cached`);
	const result = await runCommandStringAndWriteOutput('git diff --cached', diff_file);
	logger.channel()?.info(`git diff --cached exit code:`, result.exitCode);

	logger.channel()?.debug(`git diff --cached stdout:`, result.stdout);
	logger.channel()?.debug(`git diff --cached stderr:`, result.stderr);
    return `[context|${diff_file}]`;
  },
};
