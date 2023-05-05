import {Command} from './commandManager';

import { exec } from 'child_process';
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { createTempSubdirectory } from '../util/commonUtil';
import ExtensionContextHolder from '../util/extensionContext';

const mkdirAsync = promisify(fs.mkdir);
const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);


export const commitMessageCommand: Command = {
  name: 'commitMessageCommand',
  pattern: 'commit_meesage',
  description: 'commit message for changes',
  handler: async (userInput: string) => {
    const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceDir) {
        const commitmessageInstruction = path.join(workspaceDir, '.chat', 'instructions', 'commit_message', 'instCommitMessage.txt');
        return `[instruction|${commitmessageInstruction}] Write a commit message`;
    }
    return 'Write a commit message';
  },
};
