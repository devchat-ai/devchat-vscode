import {Command} from './commandManager';

import { exec } from 'child_process';
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

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
  pattern: 'git: commit message',
  description: 'commit message for changes',
  handler: async (userInput: string) => {
    const systemTempDir = os.tmpdir();
    const tempDir = path.join(systemTempDir, 'devchat/context');

    // 创建临时目录
    await createTempDirectory(tempDir);
    const diff_file = path.join(tempDir, 'diff_output.txt');
    await writeDiffFile(diff_file);

    return `[instruction|./commonInstructions.txt] [instruction|./commitMessageCommandInstructions.txt] [context|${diff_file}] Write a commit message`;
  },
};
