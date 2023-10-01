import * as vscode from 'vscode';
import CommandManager from '../command/commandManager';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { ApiKeyManager } from '../util/apiKey';


regInMessage({command: 'regCommandList'});
regOutMessage({command: 'regCommandList', result: [{name: '', pattern: '', description: ''}]});
export async function regCommandList(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const commandList = CommandManager.getInstance().getCommandList();
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

let existPannel: vscode.WebviewPanel|vscode.WebviewView|undefined = undefined;

regInMessage({command: 'regCommandList'});
regOutMessage({command: 'regCommandList', result: [{name: '', pattern: '', description: ''}]});
export async function regCommandListByDevChatRun(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	existPannel = panel;

	const commandList = await CommandManager.getInstance().getCommandListByDevChatRun();
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
		regCommandListByDevChatRun({}, existPannel!);
	}
}

export async function updateChatModels() {
	const modelList = await ApiKeyManager.getValidModels();
	MessageHandler.sendMessage(existPannel!, { command: 'regModelList', result: modelList });
}

