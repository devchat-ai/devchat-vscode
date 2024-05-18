import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';


export const customCommandContext: ChatContext = {
    name: '<Custom Local Command>',
    description: 'Click this and enter your desired command to run. The return will be added to the context.',
    handler: async () => {
        // popup a dialog to ask for the command line to run
        const customCommand = await UiUtilWrapper.showInputBox({
            prompt: 'Input your custom command',
            placeHolder: 'for example: ls -l'
        });
    
        // 检查用户是否输入了命令
        if (customCommand) {
            const tempDir = await createTempSubdirectory('devchat/context');
            const diffFile = path.join(tempDir, 'custom.txt');

			logger.channel()?.trace(`Your custom command is: ${customCommand}`);
            const result = await runCommandStringAndWriteOutput(customCommand, diffFile);
			logger.channel()?.trace(`  exit code:`, result.exitCode);

			logger.channel()?.trace(`  stdout:`, result.stdout);
			logger.channel()?.trace(`  stderr:`, result.stderr);
            return [`[context|${diffFile}]`];
        }
        return [];
  },
};
