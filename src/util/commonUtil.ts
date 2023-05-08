import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { spawn, exec } from 'child_process';

export function createTempSubdirectory(subdir: string): string {
  // 获取系统临时目录
  const tempDir = os.tmpdir();
  // 构建完整的目录路径
  let targetDir = path.join(tempDir, subdir, Date.now().toString());
  // 检查目录是否存在，如果存在则重新生成目录名称
  while (fs.existsSync(targetDir)) {
    targetDir = path.join(tempDir, subdir, Date.now().toString());
  }
  // 递归创建目录
  fs.mkdirSync(targetDir, { recursive: true });
  // 返回创建的目录的绝对路径
  return targetDir;
}

interface CommandResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }
  
  export async function runCommandAndWriteOutput(
    command: string,
    args: string[],
    outputFile: string
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
        // 获取当前工作区目录
        const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.';
    
      // 使用spawn执行命令
      const childProcess = spawn(command, args, { cwd: workspaceDir });
  
      let stdout = '';
      let stderr = '';
  
      // 监听stdout数据
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
  
      // 监听stderr数据
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
  
      // 监听进程退出事件
      childProcess.on('exit', (exitCode) => {
        // 将命令输出结果写入到文件
        fs.writeFileSync(outputFile, stdout);
  
        // 返回结果
        resolve({
          exitCode,
          stdout,
          stderr,
        });
      });
    });
  }

  export async function runCommandStringAndWriteOutput(
    commandString: string,
    outputFile: string
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
        const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.';
    
      // 使用exec执行命令行字符串
      const childProcess = exec(commandString, { cwd: workspaceDir }, (error, stdout, stderr) => {
        // 将命令输出结果写入到文件
		const data = {
			command: commandString,
			content: stdout
		};
		const jsonData = JSON.stringify(data);

        fs.writeFileSync(outputFile, jsonData);
  
        // 返回结果
        resolve({
          exitCode: error && error.code? error.code : 0,
          stdout,
          stderr,
        });
      });
    });
  }

  export async function getLanguageIdByFileName(fileName: string): Promise<string | undefined> {
    try {
      // 打开指定的文件
      const document = await vscode.workspace.openTextDocument(fileName);
      // 获取文件的语言标识符
      const languageId = document.languageId;
      return languageId;
    } catch (error) {
      // 如果无法打开文件或发生其他错误，返回undefined
      return undefined;
    }
  }