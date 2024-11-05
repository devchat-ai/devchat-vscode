import { logger } from '../../util/logger';
import * as vscode from 'vscode';


export async function updateSlashCommands() {
    logger.channel()?.debug('Updating slash commands...');
    vscode.commands.executeCommand('DevChat.InstallCommands');
    return true;
}