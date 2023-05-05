import * as path from 'path';
import * as vscode from 'vscode';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandAndWriteOutput, runCommandStringAndWriteOutput } from '../util/commonUtil';

export const customCommandContext: ChatContext = {
    name: '<custom command>',
    description: 'custorm command',
    handler: async () => {
        // popup a dialog to ask for the command line to run
        const customCommand = await vscode.window.showInputBox({
            prompt: 'Input your custom command',
            placeHolder: 'for example: ls -l'
        });
    
        // 检查用户是否输入了命令
        if (customCommand) {
            const tempDir = await createTempSubdirectory('devchat/context');
            const diff_file = path.join(tempDir, 'custom.txt');
            const result = await runCommandStringAndWriteOutput(customCommand, diff_file);
            console.log(result.exitCode);
            console.log(result.stdout);
            console.log(result.stderr);
            return `[context|${diff_file}]`;
        }
        return '';
  },
};
