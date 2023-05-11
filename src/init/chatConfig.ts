import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ncp from 'ncp';

import { logger } from '../util/logger';


function copyFileSync(source: string, target: string) {
	const data = fs.readFileSync(source);
	fs.writeFileSync(target, data);
  }
  
  function copyDirSync(source: string, target: string) {
	// 创建目标目录
	fs.mkdirSync(target, { recursive: true });
  
	// 遍历目录中的所有文件和子目录
	const files = fs.readdirSync(source);
	for (const file of files) {
	  const sourcePath = path.join(source, file);
	  const targetPath = path.join(target, file);
	  const stats = fs.statSync(sourcePath);
	  if (stats.isDirectory()) {
		// 递归拷贝子目录
		copyDirSync(sourcePath, targetPath);
	  } else {
		// 拷贝文件
		copyFileSync(sourcePath, targetPath);
	  }
	}
  }

export function createChatDirectoryAndCopyInstructionsSync(extensionUri: vscode.Uri) {
  
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }
  
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const chatWorkflowsDirPath = path.join(workspaceRoot, '.chat', 'workflows');
    const instructionsSrcPath = path.join(extensionUri.fsPath, 'workflows');
  
    try {
      // 检查 .chat 目录是否存在，如果不存在，则创建它
      if (!fs.existsSync(chatWorkflowsDirPath)) {
        fs.mkdirSync(chatWorkflowsDirPath, {recursive: true});
      } else {
        return;
      }
  
      // 将 workflows 目录复制到 .chat 目录中
	  copyDirSync(instructionsSrcPath, chatWorkflowsDirPath);
    } catch (error) {
		logger.channel()?.error('Error creating .chat directory and copying workflows:', error);
		logger.channel()?.show();
    }
}