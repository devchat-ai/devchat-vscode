import DevChat, { ChatResponse } from '../toolwrapper/devchat';
import CommandManager from '../command/commandManager';
import { logger } from '../util/logger';
import messageHistory from '../util/messageHistory';
import { TopicManager } from '../topic/topicManager';
import CustomCommands from '../command/customCommand';


let waitCreateTopic = false;


function parseDateStringToTimestamp(dateString: string): number {
	const dateS = Date.parse(dateString);
	if (!isNaN(dateS)) {
		return dateS;
	}

	const formattedDateString = dateString
	  .replace(/^[A-Za-z]{3} /, '')
	  .replace(/ /, 'T')
	  .replace(/(\d{4}) (\+\d{4})$/, '$1$2');
  
	const date = new Date(formattedDateString);
	return date.getTime();
}

export function getWaitCreateTopic(): boolean {
	return waitCreateTopic;
}

// Add this function to messageHandler.ts
export function parseMessage(message: string): { context: string[]; instruction: string[]; reference: string[]; text: string } {
	const contextRegex = /\[context\|(.*?)\]/g;
	const instructionRegex = /\[instruction\|(.*?)\]/g;
	const referenceRegex = /\[reference\|(.*?)\]/g;

	const contextPaths: string[] = [];
	const instructionPaths: string[] = [];
	const referencePaths: string[] = [];

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

export function getInstructionFiles(): string[] {
	const instructionFiles: string[] = [];

	const customCommands = CustomCommands.getInstance().getCommands();
	// visit customCommands, get default command
	for (const command of customCommands) {
		if (command.default) {
			for (const instruction of command.instructions) {
				instructionFiles.push(`${instruction}`);
			}
		}
	}

	return instructionFiles;
}

const devChat = new DevChat();
let userStop = false;


// 将解析消息的部分提取到一个单独的函数中
export async function parseMessageAndSetOptions(message: any, chatOptions: any): Promise<{ context: string[]; instruction: string[]; reference: string[]; text: string }> {
	const newText2 = await CommandManager.getInstance().processText(message.text);
	const parsedMessage = parseMessage(newText2);

	if (parsedMessage.context.length > 0) {
		chatOptions.context = parsedMessage.context;
	}

	chatOptions.header = getInstructionFiles();
	if ((parsedMessage.instruction && parsedMessage.instruction.length > 0) || newText2 !== message.text) {
		chatOptions.header = parsedMessage.instruction;
	}

	if (parsedMessage.reference.length > 0) {
		chatOptions.reference = parsedMessage.reference;
	}

	return parsedMessage;
}


export async function handleTopic(parentHash:string | undefined, message: any, chatResponse: ChatResponse) {
	waitCreateTopic = true;
	try {
		if (!chatResponse.isError) {
			messageHistory.add({ request: message.text, text: chatResponse.response, parentHash, hash: chatResponse['prompt-hash'], user: chatResponse.user, date: chatResponse.date });
	
			let topicId = TopicManager.getInstance().currentTopicId;
			if (!topicId) {
				// create new topic
				const topic = TopicManager.getInstance().createTopic();
				topicId = topic.topicId;
			}
	
			TopicManager.getInstance().updateTopic(topicId!, chatResponse['prompt-hash'], parseDateStringToTimestamp(chatResponse.date), message.text, chatResponse.response);
		}
	} finally {
		waitCreateTopic = false;
	}
}

export async function handlerResponseText(partialDataText: string, chatResponse: ChatResponse) : Promise<string|undefined> {
	let responseText = chatResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
	if (userStop) {
		userStop = false;
		if (chatResponse.isError) {
			return undefined;
		}
	}
	
	return responseText;
}

// 重构后的sendMessage函数
export async function sendMessageBase(message: any, handlePartialData: (data: { command: string, text: string, user: string, date: string}) => void, function_name: string| undefined = undefined): Promise<{ command: string, text: string, hash: string, user: string, date: string, isError: boolean }|undefined> {
	userStop = false;
	const chatOptions: any = {};
	const parsedMessage = await parseMessageAndSetOptions(message, chatOptions);

	if (message.parent_hash) {
		chatOptions.parent = message.parent_hash;
	}
	logger.channel()?.info(`parent hash: ${chatOptions.parent}`);

	chatOptions.functions = "./.chat/functions.json";
	if (function_name) {
		chatOptions.function_name = function_name;
		chatOptions.role = "function";
	}

	let partialDataText = '';
	const onData = (partialResponse: ChatResponse) => {
		partialDataText = partialResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
		handlePartialData({ command: 'receiveMessagePartial', text: partialDataText!, user: partialResponse.user, date: partialResponse.date });
	};

	const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
	await handleTopic(message.parent_hash, message, chatResponse);
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

// delete a chat message
// each message is identified by hash
export async function deleteChatMessageBase(message:{'hash': string}): Promise<boolean> {
	// if hash is undefined, return
	if (!message.hash) {
		return true;
	}

	// delete the message from messageHistory
	messageHistory.delete(message.hash);

	// delete the message by devchat
	const bSuccess = await devChat.delete(message.hash);
	if (bSuccess) {
		let topicId = TopicManager.getInstance().currentTopicId;
		if (topicId) {
			TopicManager.getInstance().deleteMessage(topicId, message.hash);
		}
	}
	return bSuccess;
}