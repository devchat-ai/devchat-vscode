// dtm.ts

import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from 'vscode';

const execAsync = promisify(exec);

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

  async scaffold(directoryTree: string): Promise<DtmResponse> {
    const { stdout } = await execAsync(`dtm scaffold "${directoryTree}" -o json`, {
      cwd: this.workspaceDir,
    });
    return JSON.parse(stdout.trim());
  }

  async patch(patchFilePath: string): Promise<DtmResponse> {
    try {
        const { stdout } = await execAsync(`dtm patch ${patchFilePath} -o json`, {
        cwd: this.workspaceDir,
        });
        return JSON.parse(stdout.trim());
    } catch (e) {
        return JSON.parse((e as Error & { stdout: string }).stdout.trim());
    }
  }
}

export default DtmWrapper;
