/*
execute vscode command
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from '../util/logger';

regInMessage({command: 'doCommand', content: ['command', 'arg1', 'arg2']});
export async function doVscodeCommand(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    // execute vscode command
    // message.content[0]: vscode command
    // message.content[1:]: args for command
    try {
        await vscode.commands.executeCommand(message.content[0], ...message.content.slice(1));
    } catch (error) {
        logger.channel()?.error(`Failed to execute command ${message.content[0]}: ${error}`);
		logger.channel()?.show();
	}
    return;
}