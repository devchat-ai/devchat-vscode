// messageHandler.ts

import * as vscode from 'vscode';
import DevChat from './devchat';

async function handleMessage(
  message: any,
  panel: vscode.WebviewPanel
): Promise<void> {
  switch (message.command) {
    case 'sendMessage':
      const devChat = new DevChat();
      const chatResponse = await devChat.chat(message.text);
      const response = chatResponse.response;
      panel.webview.postMessage({ command: 'receiveMessage', text: response });
      return;
  }
}

export default handleMessage;
