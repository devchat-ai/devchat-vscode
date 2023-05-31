import DevChat, { ChatResponse } from '../toolwrapper/devchat';
import CommandManager from '../command/commandManager';
import { logger } from '../util/logger';
import messageHistory from '../util/messageHistory';
import { TopicManager } from '../topic/topicManager';
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
let userStop = false;


// 将解析消息的部分提取到一个单独的函数中
async function parseMessageAndSetOptions(message: any, chatOptions: any): Promise<{ context: string[]; instruction: string[]; reference: string[]; text: string }> {
	const newText2 = await CommandManager.getInstance().processText(message.text);
	const parsedMessage = parseMessage(newText2);

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
	return parsedMessage;
}

// 将处理父哈希的部分提取到一个单独的函数中
function getParentHash(message: any) {
	let parentHash = undefined;
	logger.channel()?.info(`request message hash: ${message.hash}`);
	if (message.hash) {
		const hmessage = messageHistory.find(message.hash);
		parentHash = hmessage ? message.parentHash : undefined;
	} else {
		const hmessage = messageHistory.findLast();
		parentHash = hmessage ? hmessage.hash : undefined;
	}
	logger.channel()?.info(`parent hash: ${parentHash}`);
	return parentHash;
}

export async function handleTopic(parentHash:string, message: any, chatResponse: ChatResponse) {
	if (!chatResponse.isError) {
		messageHistory.add({ request: message.text, text: chatResponse.response, parentHash, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date });

		let topicId = TopicManager.getInstance().currentTopicId;
		if (!topicId) {
			// create new topic
			const topic = TopicManager.getInstance().createTopic();
			topicId = topic.topicId;
		}

		TopicManager.getInstance().updateTopic(topicId!, chatResponse['prompt-hash'], Number(chatResponse.date), message.text, chatResponse.response);
	}
}

export async function handlerResponseText(partialDataText: string, chatResponse: ChatResponse) : Promise<string|undefined> {
	let responseText = chatResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
	if (userStop) {
		userStop = false;
		if (responseText.indexOf('Exit code: undefined') >= 0) {
			return undefined;
		}
	}
	if (chatResponse.isError) {
		responseText = partialDataText + responseText;
	}
	return responseText;
}

// 重构后的sendMessage函数
export async function sendMessageBase(message: any, handlePartialData: (data: { command: string, text: string, user: string, date: string}) => void): Promise<{ command: string, text: string, hash: string, user: string, date: string, isError: boolean }|undefined> {
	const chatOptions: any = {};
	const parsedMessage = await parseMessageAndSetOptions(message, chatOptions);

	const parentHash = getParentHash(message);
	if (parentHash) {
		chatOptions.parent = parentHash;
	}

	let partialDataText = '';
	const onData = (partialResponse: ChatResponse) => {
		partialDataText = partialResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
		handlePartialData({ command: 'receiveMessagePartial', text: partialDataText!, user: partialResponse.user, date: partialResponse.date });
	};

	const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
	await handleTopic(parentHash!, message, chatResponse);
	const responseText = await handlerResponseText(partialDataText, chatResponse);
	if (responseText === undefined) {
		return;
	}
	
	return { command: 'receiveMessage', text: responseText, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date, isError: chatResponse.isError };
}

export async function stopDevChatBase(message: any): Promise<void> {
	logger.channel()?.info(`Stopping devchat`);
	userStop = true;
	devChat.stop();
}