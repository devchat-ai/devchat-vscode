import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';


export const gitDiffContext: ChatContext = {
  name: 'git diff HEAD',
  description: 'all changes since the last commit',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diffFile = path.join(tempDir, 'diff_all.txt');
    
	logger.channel()?.info(`git diff HEAD:`);
	const result = await runCommandStringAndWriteOutput('git diff HEAD', diffFile);
	logger.channel()?.info(`  exit code:`, result.exitCode);

	logger.channel()?.debug(`  stdout:`, result.stdout);
	logger.channel()?.debug(`  stderr:`, result.stderr);
    return [`[context|${diffFile}]`];
  },
};
