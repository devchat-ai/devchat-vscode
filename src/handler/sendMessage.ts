
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import DevChat, { ChatResponse } from '../toolwrapper/devchat';
import CommandManager from '../command/commandManager';
import { logger } from '../util/logger';
import { MessageHandler } from './messageHandler';
import messageHistory from '../util/messageHistory';
import CustomCommands from '../command/customCommand';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { TopicManager } from '../topic/topicManager';

let _lastMessage: any = undefined;


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
let userStop = false;


regInMessage({command: 'sendMessage', text: '', hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
regOutMessage({ command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'});
// message: { command: 'sendMessage', text: 'xxx', hash: 'xxx'}
// return message: 
//     { command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'}
//     { command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'}
export async function sendMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	_lastMessage = message;

	const newText2 = await CommandManager.getInstance().processText(message.text);
	const parsedMessage = parseMessage(newText2);
	const chatOptions: any = {};

	let parentHash = undefined;
	logger.channel()?.info(`request message hash: ${message.hash}`);
	if (message.hash) {
		const hmessage = messageHistory.find(message.hash);
		parentHash = hmessage ? message.parentHash : undefined;
	} else {
		const hmessage = messageHistory.findLast();
		parentHash = hmessage ? hmessage.hash : undefined;
	}
	if (parentHash) {
		chatOptions.parent = parentHash;
	}
	logger.channel()?.info(`parent hash: ${parentHash}`);

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
		const responseText = partialResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
		MessageHandler.sendMessage(panel, { command: 'receiveMessagePartial', text: responseText, user: partialResponse.user, date: partialResponse.date }, false);
	};

	const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
	
	if (!chatResponse.isError) {
		messageHistory.add({request: message.text, text: chatResponse.response, parentHash, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date });
		
		let topicId = TopicManager.getInstance().currentTopicId;
		if (!topicId) {
			// create new topic
			const topic = TopicManager.getInstance().createTopic();
			topicId = topic.topicId;
		}

		TopicManager.getInstance().updateTopic(topicId!, chatResponse['prompt-hash'], Number(chatResponse.date), message.text, chatResponse.response);
	}

	let responseText = chatResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
	if (userStop) {
		userStop = false;
		if (responseText.indexOf('Exit code: undefined') >= 0) {
			return;
		}
	}

	MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: responseText, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date, isError: chatResponse.isError });
	return;
}

// regeneration last message again
regInMessage({command: 'regeneration'});
export async function regeneration(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// call sendMessage to send last message again
	if (_lastMessage) {
		sendMessage(_lastMessage, panel);
	}
}

regInMessage({command: 'stopDevChat'});
export async function stopDevChat(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	logger.channel()?.info(`Stopping devchat`);
	userStop = true;
	devChat.stop();
}



