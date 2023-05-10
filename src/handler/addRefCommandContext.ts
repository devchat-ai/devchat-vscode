import * as vscode from 'vscode';
import { handleRefCommand } from '../context/contextRef';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';


regInMessage({command: 'addRefCommandContext', refCommand: ''});
regOutMessage({command: 'appendContext', context: ''});
// message: { command: 'addRefCommandContext', refCommand: string }
// User input: /ref ls . then "ls ." will be passed to refCommand
export async function addRefCommandContext(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const contextStr = await handleRefCommand(message.refCommand);
    MessageHandler.sendMessage(panel, { command: 'appendContext', context: contextStr });
	return;
}
