// messageHandler.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import DevChat, { LogOptions } from './devchat';
import DtmWrapper from './dtm';
import applyCode, {applyCodeFile} from './applyCode';

import './loadCommands';
import CommandManager, { Command } from './commandManager';

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

export function sendFileSelectMessage(panel: vscode.WebviewPanel, filePath: string): void {
  panel.webview.postMessage({ command: 'file_select', filePath });
}

export function sendCodeSelectMessage(panel: vscode.WebviewPanel, codeBlock: string): void {
  panel.webview.postMessage({ command: 'code_select', codeBlock });
}

export function askAI(panel: vscode.WebviewPanel, codeBlock: string, question: string): void {
  panel.webview.postMessage({ command: 'ask_ai', codeBlock, question });
}

// Add this function to messageHandler.ts
function parseMessageForContext(message: string): { context: string[]; text: string } {
  const contextRegex = /\[context\|(.*?)\]/g;
  const contextPaths = [];
  let match;

  while ((match = contextRegex.exec(message)) !== null) {
    contextPaths.push(match[1]);
  }

  const text = message.replace(contextRegex, '').trim();
  return { context: contextPaths, text };
}

async function handleMessage(
  message: any,
  panel: vscode.WebviewPanel
): Promise<void> {
  const devChat = new DevChat();
  const dtmWrapper = new DtmWrapper();

  switch (message.command) {
    case 'sendMessage':
      const parsedMessage = parseMessageForContext(message.text);
      const chatOptions: any = lastPromptHash ? { parent: lastPromptHash } : {};

      if (parsedMessage.context.length > 0) {
        chatOptions.context = parsedMessage.context;
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
    case 'block_apply':
      const tempPatchFile = await saveTempPatchFile(message.content);
      try {
        const patchResult = await dtmWrapper.patch(tempPatchFile);
        await deleteTempPatchFile(tempPatchFile);
        if (patchResult.status === 0) {
          vscode.window.showInformationMessage('Patch applied successfully.');
        } else {
          vscode.window.showErrorMessage(`Error applying patch: ${patchResult.message} ${patchResult.log}`);
        }
      } catch (error) {
        await deleteTempPatchFile(tempPatchFile);
        vscode.window.showErrorMessage(`Error applying patch: ${error}`);
      }
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
      const newText = CommandManager.getInstance().processText(message.text);
      panel.webview.postMessage({ command: 'convertCommand', result: newText });
      return;
  }
}

export default handleMessage;
