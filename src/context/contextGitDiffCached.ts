import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';


export const gitDiffCachedContext: ChatContext = {
  name: 'git diff --cached',
  description: 'diff for cached changes',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diffFile = path.join(tempDir, 'diff_cached.txt');
    
	logger.channel()?.info(`git diff --cached:`);
	const result = await runCommandStringAndWriteOutput('git diff --cached', diffFile);
	logger.channel()?.info(`  exit code:`, result.exitCode);

	logger.channel()?.debug(`  stdout:`, result.stdout);
	logger.channel()?.debug(`  stderr:`, result.stderr);
    return [`[context|${diffFile}]`];
  },
};
