import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages'; // Ensure these functions are imported
import { MessageHandler } from './messageHandler';

// Register the incoming and outgoing messages for the 'getIdeLanguage' command
regInMessage({ command: 'getIdeLanguage' });
regOutMessage({ command: 'ideLanguage', lang: "" }); // Placeholder for the lang property
// Implement the handler function to get the current IDE language setting
export async function getIdeLanguage(panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    // Get the current IDE language setting
    const ideLanguage = vscode.env.language;
	// 'en' stands for English, 'zh-cn' stands for Simplified Chinese

    // Construct the message with the language information
    const langMessage = {
        "command": "ideLanguage",
        "lang": ideLanguage
    };

    // Send the message to the webview panel or view
    MessageHandler.sendMessage(panel, langMessage);
}