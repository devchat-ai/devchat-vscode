import {Command} from './commandManager';

import { exec } from 'child_process';
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { createTempSubdirectory } from '../util/commonUtil';
import { logger } from '../util/logger';

const mkdirAsync = promisify(fs.mkdir);
const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);


async function createTempDirectory(tempDir: string): Promise<void> {
    try {
        await mkdirAsync(tempDir, {recursive: true});
    } catch (err) {
		logger.channel()?.error(`Error creating temporary directory: ${err}`);
		logger.channel()?.show();
    }
}

export const commitMessageCommand: Command = {
  name: 'commitMessageCommand',
  pattern: 'commit_meesage',
  description: 'commit message for changes',
  handler: async (userInput: string) => {
    const tempDir = createTempSubdirectory('devchat/context');

    const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceDir) {
        const commitmessageInstruction = path.join(workspaceDir, '.chat', 'instructions', 'commit_message', 'instCommitMessage.txt');
        return `[instruction|${commitmessageInstruction}] Write a commit message`;
    }
    return 'Write a commit message';
  },
};
