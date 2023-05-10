
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import DevChat, { ChatResponse } from '../toolwrapper/devchat';
import CommandManager from '../command/commandManager';
import { logger } from '../util/logger';
import { MessageHandler } from './messageHandler';
import messageHistory from '../util/messageHistory';
import CustomCommands from '../command/customCommand';


// Add this function to messageHandler.ts
function parseMessage(message: string): { context: string[]; instruction: string[]; reference: string[]; text: string } {
	const contextRegex = /\[context\|(.*?)\]/g;
	const instructionRegex = /\[instruction\|(.*?)\]/g;
	const referenceRegex = /\[reference\|(.*?)\]/g;

	const contextPaths = [];
	const instructionPaths = [];
	const referencePaths = [];

	let match;

	// 提取 context
	while ((match = contextRegex.exec(message)) !== null) {
		contextPaths.push(match[1]);
	}

	// 提取 instruction
	while ((match = instructionRegex.exec(message)) !== null) {
		instructionPaths.push(match[1]);
	}

	// 提取 reference
	while ((match = referenceRegex.exec(message)) !== null) {
		referencePaths.push(match[1]);
	}

	// 移除标签，保留纯文本
	const text = message
		.replace(contextRegex, '')
		.replace(instructionRegex, '')
		.replace(referenceRegex, '')
		.trim();

	return { context: contextPaths, instruction: instructionPaths, reference: referencePaths, text };
}

function getInstructionFiles(): string[] {
	const instructionFiles: string[] = [];

	const customCommands = CustomCommands.getInstance().getCommands();
	// visit customCommands, get default command
	for (const command of customCommands) {
		if (command.default) {
			for (const instruction of command.instructions) {
				instructionFiles.push(`./.chat/workflows/${command.name}/${instruction}`);
			}
		}
	}

	return instructionFiles;
}

const devChat = new DevChat();


// message: { command: 'sendMessage', text: 'xxx', hash: 'xxx'}
// return message: 
//     { command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'}
//     { command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'}
export async function sendMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const newText2 = await CommandManager.getInstance().processText(message.text);
	const parsedMessage = parseMessage(newText2);
	const chatOptions: any = {};

	let parent_hash = undefined;
	logger.channel()?.info(`request message hash: ${message.hash}`)
	if (message.hash) {
		const hmessage = messageHistory.find(panel, message.hash);
		parent_hash = hmessage ? message.parent_hash : undefined;
	} else {
		const hmessage = messageHistory.findLast(panel);
		parent_hash = hmessage ? hmessage.hash : undefined;
	}
	if (parent_hash) {
		chatOptions.parent = parent_hash;
	}
	logger.channel()?.info(`parent hash: ${parent_hash}`);

	if (parsedMessage.context.length > 0) {
		chatOptions.context = parsedMessage.context;
	}

	chatOptions.header = getInstructionFiles();
	if (parsedMessage.instruction.length > 0) {
		chatOptions.header = parsedMessage.instruction;
	}

	if (parsedMessage.reference.length > 0) {
		chatOptions.reference = parsedMessage.reference;
	}

	const onData = (partialResponse: ChatResponse) => {
		MessageHandler.sendMessage(panel, { command: 'receiveMessagePartial', text: partialResponse.response, user: partialResponse.user, date: partialResponse.date }, false);
	};

	const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
	
	if (!chatResponse.isError) {
		messageHistory.add(panel, {request: message.text, text: parsedMessage.text, parent_hash, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date });
	}

	MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: chatResponse.response, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date, isError: chatResponse.isError });
	return;
}

export async function stopDevChat(message: any, panel: vscode.WebviewPanel): Promise<void> {
	logger.channel()?.info(`Stopping devchat`);
	devChat.stop();
}



