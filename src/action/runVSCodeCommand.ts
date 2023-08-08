/*
执行vscode command，类名：RunVSCommandAction
*/

import * as vscode from 'vscode';
import { Action } from './customAction';
import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';

export class RunVSCodeCommandAction implements Action {
    name: string;
    description: string;
    type: string[];
    action: string;
    handler: string[];
    args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

    constructor() {
        this.name = 'run_vscode_command';
        this.description = 'Run VSCode command';
        this.type = ['command'];
        this.action = 'run_vscode_command';
        this.handler = [];
        this.args = [
            {
                "name": "command", 
                "description": 'VSCode command to run.', 
                "type": "string", 
                "required": true,
                "from": "content.content.command"
            },
            {
                "name": "args", 
                "description": 'Arguments for the command, separated by comma.', 
                "type": "string", 
                "required": false,
                "from": "content.content.args"
            }
        ];
    }

    async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
        try {
            const commandArgs = args.args ? args.args.split(',') : [];
            const result = await vscode.commands.executeCommand(args.command, ...commandArgs);
            return {exitCode: 0, stdout: JSON.stringify(result), stderr: ""};
        } catch (error) {
            logger.channel()?.error(`Failed to run VSCode command: ${error}`);
            logger.channel()?.show();
            return {exitCode: -1, stdout: '', stderr: `Failed to run VSCode command: ${error}`};
        }
    }
}