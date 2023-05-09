import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';


export const gitDiffContext: ChatContext = {
  name: 'git diff',
  description: 'diff for all changes',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diff_file = path.join(tempDir, 'diff_all.txt');
    
	logger.channel()?.info(`git diff`);
	const result = await runCommandStringAndWriteOutput('git diff', diff_file);
	logger.channel()?.info(`git diff exit code:`, result.exitCode);

	logger.channel()?.debug(`git diff stdout:`, result.stdout);
	logger.channel()?.debug(`git diff stderr:`, result.stderr);
    return `[context|${diff_file}]`;
  },
};
