import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';
import DevChat from '../toolwrapper/devchat';


export interface Command {
	name: string;
	pattern: string;
	description: string;
	path: string;
	args: number;
	handler: (commandName: string, userInput: string) => Promise<string>;
}

async function getCommandListByDevChatRun(includeHide: boolean = false): Promise<Command[]> {
	// load commands from CustomCommands
	let newCommands: Command[] = [];

	const devChat = new DevChat();
	const commandList = await devChat.commands();
	commandList.forEach(command => {
		const commandObj: Command = {
			name: command.name,
			pattern: command.name,
			description: command.description,
			path: command.path,
			args: 0,
			handler: async (commandName: string, userInput: string) => { return ''; }
		};
		newCommands.push(commandObj);
	});
	
	return newCommands;
}

let existPannel: vscode.WebviewPanel|vscode.WebviewView|undefined = undefined;

regInMessage({command: 'regCommandList'});
regOutMessage({command: 'regCommandList', result: [{name: '', pattern: '', description: ''}]});
export async function getWorkflowCommandList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	existPannel = panel;

	const commandList = await getCommandListByDevChatRun();
	const commandCovertedList = commandList.map(command => {
		if (command.args > 0) {
			// replace {{prompt}} with {{["",""]}}, count of "" is args
			const prompt = Array.from({length: command.args}, () => "");
			command.pattern = command.pattern.replace('{{prompt}}', '{{' + JSON.stringify(prompt) + '}}');
		}
		return command;
	});

	MessageHandler.sendMessage(panel, { command: 'regCommandList', result: commandCovertedList });
	return;
}

export async function sendCommandListByDevChatRun() {
	if (existPannel) {
		await getWorkflowCommandList({}, existPannel!);
	}
}
