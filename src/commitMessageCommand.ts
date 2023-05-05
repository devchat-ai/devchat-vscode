import {Command} from './commandManager';

import { exec } from 'child_process';
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { createTempSubdirectory } from './commonUtil';
import ExtensionContextHolder from './extensionContext';

const mkdirAsync = promisify(fs.mkdir);
const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);


async function createTempDirectory(tempDir: string): Promise<void> {
    try {
        await mkdirAsync(tempDir, {recursive: true});
    } catch (err) {
        console.error(`Error creating temporary directory: ${err}`);
    }
}

async function writeDiffFile(diff_file: string) {
    try {
        const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    
        const { stdout, stderr } = await execAsync('git diff --cached', {
            cwd: workspaceDir
          });
        if (stderr) {
            console.error(`Error output from git diff --cached: ${stderr}`);
            return;
        }
        // 将结果写入到临时文件中
        const tempFilePath = diff_file;
        await writeFileAsync(tempFilePath, stdout);
    } catch (err) {
        console.error(`Error executing git diff --cached: ${err}`);
    }
}

export const commitMessageCommand: Command = {
  name: 'commitMessageCommand',
  pattern: 'commit_meesage',
  description: 'commit message for changes',
  handler: async (userInput: string) => {
    const tempDir = createTempSubdirectory('devchat/context');

    // // 创建临时目录
    // const diff_file = path.join(tempDir, 'diff_output.txt');
    // await writeDiffFile(diff_file);

    // return `[context|${diff_file}] Write a commit message`;

    const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceDir) {
        const commitmessageInstruction = path.join(workspaceDir, '.chat', 'instructions', 'commit_message', 'instCommitMessage.txt');
        return `[instruction|${commitmessageInstruction}] Write a commit message`;
    }
    return 'Write a commit message';
  },
};
