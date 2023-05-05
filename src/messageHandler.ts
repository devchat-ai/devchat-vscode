// messageHandler.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import DevChat, { LogOptions } from './devchat';
import DtmWrapper from './dtm';
import {applyCodeFile, diffView, applyCode} from './applyCode';

import './loadCommands';
import './loadContexts'
import CommandManager, { Command } from './commandManager';
import ChatContextManager from './contextManager';
import { handleCodeSelected } from './contextCodeSelected';
import { handleFileSelected } from './contextFileSelected';

import * as vscode3 from 'vscode';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

let lastPromptHash: string | undefined;

async function saveTempPatchFile(content: string): Promise<string> {
  const tempPatchFilePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.temp_patch_file.patch');
  await writeFileAsync(tempPatchFilePath, content);
  return tempPatchFilePath;
}

async function deleteTempPatchFile(filePath: string): Promise<void> {
  await unlinkAsync(filePath);
}

export async function sendFileSelectMessage(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  const codeContext = await handleFileSelected(filePath);
  panel.webview.postMessage({ command: 'appendContext', context: codeContext });
}

export async function sendCodeSelectMessage(panel: vscode.WebviewPanel, filePath: string, codeBlock: string): Promise<void> {
  const codeContext = await handleCodeSelected(filePath, codeBlock);
  panel.webview.postMessage({ command: 'appendContext', context: codeContext });
}

export function askAI(panel: vscode.WebviewPanel, codeBlock: string, question: string): void {
  panel.webview.postMessage({ command: 'ask_ai', codeBlock, question });
}

// Add this function to messageHandler.ts
function parseMessage(message: string): { context: string[]; instruction: string[]; reference: string[]; text: string } {
  const contextRegex = /\[context\|(.*?)\]/g;
  const instructionRegex = /\[instruction\|(.*?)\]/g;
  const referenceRegex = /\[reference\|(.*?)\]/g;

  const contextPaths = [];
  const instructionPaths = [];
  const referencePaths = [];

  let match;

  // 提取 context
  while ((match = contextRegex.exec(message)) !== null) {
    contextPaths.push(match[1]);
  }

  // 提取 instruction
  while ((match = instructionRegex.exec(message)) !== null) {
    instructionPaths.push(match[1]);
  }

  // 提取 reference
  while ((match = referenceRegex.exec(message)) !== null) {
    referencePaths.push(match[1]);
  }

  // 移除标签，保留纯文本
  const text = message
    .replace(contextRegex, '')
    .replace(instructionRegex, '')
    .replace(referenceRegex, '')
    .trim();

  return { context: contextPaths, instruction: instructionPaths, reference: referencePaths, text };
}

function getInstructionFiles(): string[] {
  const instructionFiles: string[] = [];
  const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (workspaceDir) {
    const chatInstructionsPath = path.join(workspaceDir, '.chat', 'instructions');
    try {
      // 读取 chatInstructionsPath 目录下的所有文件和目录
      const files = fs.readdirSync(chatInstructionsPath);
      // 过滤出文件，忽略目录
      for (const file of files) {
        const filePath = path.join(chatInstructionsPath, file);
        const fileStats = fs.statSync(filePath);
        if (fileStats.isFile()) {
          instructionFiles.push(filePath);
        }
      }
    } catch (error) {
      console.error('Error reading instruction files:', error);
    }
  }
  return instructionFiles;
}

async function handleMessage(
  message: any,
  panel: vscode.WebviewPanel
): Promise<void> {
  const devChat = new DevChat();
  const dtmWrapper = new DtmWrapper();

  switch (message.command) {
    case 'sendMessage':
      const newText2 = await CommandManager.getInstance().processText(message.text);
      panel.webview.postMessage({ command: 'convertCommand', result: newText2 });

      const parsedMessage = parseMessage(newText2);
      const chatOptions: any = lastPromptHash ? { parent: lastPromptHash } : {};

      if (parsedMessage.context.length > 0) {
        chatOptions.context = parsedMessage.context;
      }

      chatOptions.header = getInstructionFiles();

      if (parsedMessage.reference.length > 0) {
        chatOptions.reference = parsedMessage.reference;
      }

      let partialData = "";
      const onData = (partialResponse: string) => {
        partialData += partialResponse;
        panel.webview.postMessage({ command: 'receiveMessagePartial', text: partialData });
      };

      const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
      lastPromptHash = chatResponse["prompt-hash"];
      const response = chatResponse.response;
      panel.webview.postMessage({ command: 'receiveMessage', text: response });
      return;
    case 'historyMessages':
      const logOptions: LogOptions = message.options || {};
      const logEntries = await devChat.log(logOptions);
      panel.webview.postMessage({ command: 'loadHistoryMessages', entries: logEntries });
      return;
    case 'show_diff':
      diffView(message.content);
      return;
    // TODO: remove block_apply
    case 'block_apply':
      diffView(message.content);
      return;
    case 'code_apply':
      await applyCode(message.content);
      return;
    case 'code_file_apply':
      await applyCodeFile(message.content);
      return;
    case 'regCommandList':
      const commandList = CommandManager.getInstance().getCommandList();
      panel.webview.postMessage({ command: 'regCommandList', result: commandList });
      return;
    case 'convertCommand':
      const newText = await CommandManager.getInstance().processText(message.text);
      panel.webview.postMessage({ command: 'convertCommand', result: newText });
      return;
    case 'doCommit':
      const commitResult = await dtmWrapper.commit(message.content);
      if (commitResult.status === 0) {
        vscode.window.showInformationMessage('Commit successfully.');
      } else {
        vscode.window.showErrorMessage(`Error commit fail: ${commitResult.message} ${commitResult.log}`);
      }
      return;
    case 'regContextList':
      const contextList = ChatContextManager.getInstance().getContextList();
      panel.webview.postMessage({ command: 'regContextList', result: contextList });
      return;
    case 'addContext':
      const contextStr = await ChatContextManager.getInstance().processText(message.selected);
      panel.webview.postMessage({ command: 'appendContext', context: contextStr });
      return;
  }
}

export default handleMessage;
