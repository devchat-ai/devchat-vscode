import { spawn } from "child_process";
import * as vscode from 'vscode';

interface DtmResponse {
  status: number;
  message: string;
  log: string;
}

class DtmWrapper {
  private workspaceDir: string;

  constructor() {
    this.workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.';
  }

  private async runCommand(command: string, args: string[]): Promise<DtmResponse> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: this.workspaceDir });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data;
      });

      child.stderr.on('data', (data) => {
        stderr += data;
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(stdout.trim()));
        } else {
          reject(JSON.parse(stdout.trim()));
        }
      });
    });
  }

  async scaffold(directoryTree: string): Promise<DtmResponse> {
    return await this.runCommand('dtm', ['scaffold', directoryTree, '-o', 'json']);
  }

  async patch(patchFilePath: string): Promise<DtmResponse> {
    return await this.runCommand('dtm', ['patch', patchFilePath, '-o', 'json']);
  }

  async commit(commitMsg: string): Promise<DtmResponse> {
    try {
      return await this.runCommand('dtm', ['commit', '-m', commitMsg, '-o', 'json']);
    } catch (error) {
      // 处理异常
      console.error('Error in commit:', error);
      return {'status': -1, 'message': 'exception error', 'log': 'exception error'};
    }
  }
}

export default DtmWrapper;
