import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandAndWriteOutput } from './commonUtil';

export const gitDiffCachedContext: ChatContext = {
  name: 'git diff cached',
  description: 'diff for cached changes',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diff_file = path.join(tempDir, 'diff_cached.txt');
    const result = await runCommandAndWriteOutput('git', ['diff', '--cached'], diff_file);
    console.log(result.exitCode);
    console.log(result.stdout);
    console.log(result.stderr);
    return `[context|${diff_file}]`;
  },
};
