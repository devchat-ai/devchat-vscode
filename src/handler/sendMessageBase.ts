import DevChat, { ChatOptions, ChatResponse } from '../toolwrapper/devchat';
import { logger } from '../util/logger';
import messageHistory from '../util/messageHistory';
import { assertValue } from '../util/check';


/**
 * Class to handle user interaction stop events.
 */
class UserStopHandler {
	/**
	 * Flag to indicate if user interaction is stopped.
	 */
	private static userStop: boolean = false;

	/**
	 * Stops user interaction.
	 */
	public static stopUserInteraction(): void {
		UserStopHandler.userStop = true;
	}

	/**
	 * Resumes user interaction.
	 */
	public static resumeUserInteraction(): void {
		UserStopHandler.userStop = false;
	}

	/**
	 * Checks if user interaction is stopped.
	 * 
	 * @returns {boolean} - Returns true if user interaction is stopped, false otherwise.
	 */
	public static isUserInteractionStopped(): boolean {
		return UserStopHandler.userStop;
	}
}

/**
 * Parses a date string and returns the corresponding timestamp.
 *
 * @param {string} dateString - The date string to be parsed.
 * @returns {number} - The timestamp corresponding to the date string.
 */
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

/**
 * Parses a message and extracts the context, instruction, reference, and text.
 *
 * @param {string} message - The message to be parsed.
 * @returns {{ context: string[]; instruction: string[]; reference: string[]; text: string }} - An object containing the context, instruction, reference, and text extracted from the message.
 */
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

/**
 * Parses a message and sets the chat options based on the parsed message.
 *
 * @param {any} message - The message object.
 * @returns {Promise<[{ context: string[]; instruction: string[]; reference: string[]; text: string }, ChatOptions]>} - A Promise that resolves to an array containing the parsed message and the chat options.
 */
export async function parseMessageAndSetOptions(message: any): Promise<[{ context: string[]; instruction: string[]; reference: string[]; text: string }, ChatOptions]> {
	const parsedMessage = parseMessage(message.text);

	const chatOptions: ChatOptions = {
		header: [],
		...message.parent_hash ? { parent: message.parent_hash } : {},
		...parsedMessage.context.length > 0 ? { context: parsedMessage.context } : {},
		...parsedMessage.reference.length > 0 ? { reference: parsedMessage.reference } : {},
	};

	return [parsedMessage, chatOptions];
}

/**
 * Adds a message to the message history.
 *
 * @param {any} message - The message object.
 * @param {ChatResponse} chatResponse - The chat response object.
 * @param {string | undefined} parentHash - The hash of the parent message, if any.
 * @returns {void}
 */
export async function addMessageToHistory(message: any, chatResponse: ChatResponse, parentHash: string | undefined): Promise<void> {
	messageHistory.add({ 
		request: message.text, 
		text: chatResponse.response, 
		parentHash, 
		hash: chatResponse['prompt-hash'], 
		user: chatResponse.user, 
		date: chatResponse.date 
	});
}

/**
 * Processes the chat response by replacing certain patterns in the response text.
 *
 * @param {ChatResponse} chatResponse - The chat response object.
 * @returns {string} - The processed response text.
 */
export function processChatResponse(chatResponse: ChatResponse) : string {
	let responseText = chatResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
	return responseText;
}


const devChat = new DevChat();

/**
 * Sends a message to the DevChat and handles the response.
 *
 * @param {any} message - The message object.
 * @param {(data: { command: string, text: string, user: string, date: string}) => void} handlePartialData - A function to handle partial data.
 * @param {string | undefined} function_name - The name of the function, if any.
 * @returns {Promise<{ command: string, text: string, hash: string, user: string, date: string, isError: boolean } | undefined>} - A Promise that resolves to an object containing the command, text, hash, user, date, and isError properties, or undefined if an error occurred.
 */
export async function sendMessageBase(message: any, handlePartialData: (data: { command: string, text: string, user: string, date: string}) => void): Promise<{ command: string, text: string, hash: string, user: string, date: string, isError: boolean }|undefined> {
	try {
		UserStopHandler.resumeUserInteraction();
		
		// parse context and others from message
		const [parsedMessage, chatOptions] = await parseMessageAndSetOptions(message);
		logger.channel()?.trace(`parent hash: ${chatOptions.parent}`);

		// call devchat chat
		const chatResponse = await devChat.chat(
			parsedMessage.text,
			chatOptions,
			(partialResponse: ChatResponse) => {
				const partialDataText = partialResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
				handlePartialData({ command: 'receiveMessagePartial', text: partialDataText!, user: partialResponse.user, date: partialResponse.date });
			});

		assertValue(UserStopHandler.isUserInteractionStopped(), "User Stopped");
		
		await addMessageToHistory(message, chatResponse, message.parent_hash);
		
		return {
			command: 'receiveMessage',
			text: processChatResponse(chatResponse),
			hash: chatResponse['prompt-hash'],
			user: chatResponse.user,
			date: chatResponse.date,
			isError: chatResponse.isError
		};
	} catch (error: any) {
		logger.channel()?.error(`Error occurred while sending response: ${error.message}`);
		return ;
	} finally {
		UserStopHandler.resumeUserInteraction();
	}
}

/**
 * Stops the DevChat and user interaction.
 *
 * @param {any} message - The message object.
 * @returns {Promise<void>} - A Promise that resolves when the DevChat and user interaction have been stopped.
 */
export async function stopDevChatBase(message: any): Promise<void> {
	logger.channel()?.info(`Stopping devchat`);
	UserStopHandler.stopUserInteraction();
	devChat.stop();
}

/**
 * Deletes a chat message.
 * Each message is identified by a hash.
 * 
 * @param {Object} message - The message object.
 * @param {string} message.hash - The hash of the message.
 * @returns {Promise<boolean>} - Returns true if the deletion was successful, false otherwise.
 * @throws Will throw an error if the deletion was unsuccessful.
 */
export async function deleteChatMessageBase(message:{'hash': string}): Promise<boolean> {
	try {
		assertValue(!message.hash, 'Message hash is required');
		// delete the message from messageHistory
		messageHistory.delete(message.hash);

		// delete the message by devchat
		const bSuccess = await devChat.delete(message.hash);
		assertValue(!bSuccess, "Failed to delete message from devchat");
		return true;
	} catch (error: any) {
		logger.channel()?.error(`Error: ${error.message}`);
		logger.channel()?.show();
		return false;
	}
}


/**
 * Sends a text message to the DevChat.
 *
 * @param {string} text - The text message to be sent.
 * @returns {Promise<void>} - A Promise that resolves when the message has been sent.
 */
export async function sendTextToDevChat(text: string): Promise<void> {
	return devChat.input(text);
}