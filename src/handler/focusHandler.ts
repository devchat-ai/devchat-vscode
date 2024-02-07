import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';


export async function focusDevChatInput(panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const inputFocusMessage = {"command": "focusDevChatInput"};
    if (panel) {
        MessageHandler.sendMessage(panel, inputFocusMessage);
    }
}
