import * as path from 'path';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';
import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';


export const customCommandContext: ChatContext = {
    name: '<custom command>',
    description: 'custorm command',
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

			logger.channel()?.info(`custom command: ${customCommand}`);
            const result = await runCommandStringAndWriteOutput(customCommand, diffFile);
			logger.channel()?.info(`custom command: ${customCommand} exit code:`, result.exitCode);

			logger.channel()?.debug(`custom command: ${customCommand} stdout:`, result.stdout);
			logger.channel()?.debug(`custom command: ${customCommand} stderr:`, result.stderr);
            return `[context|${diffFile}]`;
        }
        return '';
  },
};
