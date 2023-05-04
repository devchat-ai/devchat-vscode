import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandAndWriteOutput } from './commonUtil';

export const gitDiffContext: ChatContext = {
  name: 'git diff',
  description: 'diff for all changes',
  handler: async () => {
    const tempDir = await createTempSubdirectory('devchat/context');
    const diff_file = path.join(tempDir, 'diff_all.txt');
    const result = await runCommandAndWriteOutput('git', ['diff'], diff_file);
    console.log(result.exitCode);
    console.log(result.stdout);
    console.log(result.stderr);
    return `[context|${diff_file}]`;
  },
};
