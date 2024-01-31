import * as vscode from 'vscode';


export async function updateSlashCommands() {
    vscode.commands.executeCommand('DevChat.InstallCommands');
    return true;
}