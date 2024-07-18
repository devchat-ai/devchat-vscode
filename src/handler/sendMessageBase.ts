import { logger } from '../util/logger';
import { assertValue } from '../util/check';
import { DevChatClient, ChatRequest, ChatResponse, buildRoleContextsFromFiles, LogData } from '../toolwrapper/devchatClient';
import { DevChatCLI } from '../toolwrapper/devchatCLI';
import { ApiKeyManager } from '../util/apiKey';


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


// TODO: to be removed later
interface ChatOptions {
	parent?: string;
	reference?: string[];
	header?: string[];
	context?: string[];
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
 * Processes the chat response by replacing certain patterns in the response text.
 *
 * @param {ChatResponse} chatResponse - The chat response object.
 * @returns {string} - The processed response text.
 */
export function processChatResponse(chatResponse: ChatResponse) : string {
	let responseText = chatResponse.response.replace(/```\ncommitmsg/g, "```commitmsg");
	return responseText;
}


// const devChat = new DevChat();
const dcClient = new DevChatClient();
const dcCLI = new DevChatCLI();

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

 
		// send chat message to devchat service
		const llmModelData = await ApiKeyManager.llmModel();
		assertValue(!llmModelData || !llmModelData.model, 'You must select a LLM model to use for conversations');
		const chatReq: ChatRequest = {
            content: parsedMessage.text,
            model_name: llmModelData.model,
			api_key: llmModelData.api_key,
			api_base: llmModelData.api_base,
            parent: chatOptions.parent,
            context: chatOptions.context,
        };
        let chatResponse = await dcClient.message(
            chatReq,
            (partialRes: ChatResponse) => {
				const text = partialRes.response;
                handlePartialData({
                    command: "receiveMessagePartial",
                    text: text!,
                    user: partialRes.user,
                    date: partialRes.date,
                });
            }
        );

		let workflowRes: ChatResponse | undefined = undefined;
		if (chatResponse.finish_reason === "should_run_workflow") {
            // invoke workflow via cli
            workflowRes = await dcCLI.runWorkflow(
                parsedMessage.text,
                chatOptions,
                (partialResponse: ChatResponse) => {
                    const partialDataText = partialResponse.response;
                    handlePartialData({
                        command: "receiveMessagePartial",
                        text: partialDataText!,
                        user: partialResponse.user,
                        date: partialResponse.date,
                    });
                }
            );
        }

		const finalResponse = workflowRes || chatResponse;

		// insert log
		const roleContexts = await buildRoleContextsFromFiles(chatOptions.context);
		const messages = [
			{
				role: "user",
				content: chatReq.content,
			},
			{
				role: "assistant",
				content: finalResponse.response,
			},
			...roleContexts
		];
		
		const logData: LogData = {
			model: llmModelData.model,
			messages: messages,
			parent: chatOptions.parent,
			timestamp: Math.floor(Date.now()/1000),
			// TODO: 1 or real value?
			request_tokens: 1,
			response_tokens: 1,
		};
		const logRes = await dcClient.insertLog(logData);

		if (logRes.hash) {
			finalResponse["prompt-hash"] = logRes.hash;
		}

		assertValue(UserStopHandler.isUserInteractionStopped(), "User Stopped");
		
		return {
			command: 'receiveMessage',
			text: processChatResponse(finalResponse),
			hash: finalResponse['prompt-hash'],
			user: finalResponse.user,
			date: finalResponse.date,
			isError: finalResponse.isError
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
	dcClient.stopAllRequest();
	dcCLI.stop();
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

		// delete the message by devchatClient
		const res = await dcClient.deleteLog(message.hash);
		assertValue(!res.success, "Failed to delete message from devchat client");

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
	dcCLI.input(text);
	return;
}