

import { TopicManager } from '../topic/topicManager';
import { LogEntry } from '../toolwrapper/devchat';
import messageHistory from '../util/messageHistory';
import { ApiKeyManager } from '../util/apiKey';
import { logger } from '../util/logger';

let isApiSet: boolean | undefined = undefined;

export interface LoadHistoryMessages {
	command: string;
	entries: Array<LogEntry>;
}

function welcomeMessage(): LogEntry {
	// create default logEntry to show welcome message
	return {
		hash: 'message',
		parent: '',
		user: 'system',
		date: '',
		request: 'How do I use DevChat?',
		response: `
Do you want to write some code or have a question about the project? Simply right-click on your chosen files or code snippets and add them to DevChat. Feel free to ask me anything or let me help you with coding.

Don't forget to check out the "+" button on the left of the input to add more context. To see a list of workflows you can run in the context, just type "/". Happy prompting!
		`,
		context: []
	} as LogEntry;
}

function apiKeyMissedMessage(): LogEntry {
	// create default logEntry to show welcome message
	return {
		hash: 'message',
		parent: '',
		user: 'system',
		date: '',
		request: 'Is OPENAI_API_KEY ready?',
		response: `
OPENAI_API_KEY is missing from your environment or settings. Kindly input your OpenAI or DevChat key, and I'll ensure DevChat is all set for you.
		`,
		context: []
	} as LogEntry;
}

export function isValidApiKey(apiKey: string) {
	let apiKeyStrim = apiKey.trim();
	if (ApiKeyManager.getKeyType(apiKeyStrim) === undefined) {
		return false;
	}
	return true;
}

export async function isWaitForApiKey() {
	if (isApiSet === undefined) {
		const apiKey = await ApiKeyManager.getApiKey();
		isApiSet = apiKey !== undefined;
	}
	return !isApiSet;
}

export async function loadTopicHistoryLogs() : Promise<Array<LogEntry> | undefined>  {
	const topicId = TopicManager.getInstance().currentTopicId;
	let logEntriesFlat: Array<LogEntry> = [];
	if (topicId) {
		logEntriesFlat = await TopicManager.getInstance().getTopicHistory(topicId);
	}

	if (topicId !== TopicManager.getInstance().currentTopicId) {
		logger.channel()?.info(`Current topic changed dure load topic hsitory!`)
		return undefined;
	}
	return logEntriesFlat;
}

export function updateCurrentMessageHistory(logEntries: Array<LogEntry>): void {
	messageHistory.clear();
	messageHistory.setTopic(TopicManager.getInstance().currentTopicId!);

	for (let i = 0; i < logEntries.length; i++) {
		let entryOld = logEntries[i];
		let entryNew = {
			date: entryOld.date,
			hash: entryOld.hash,
			request: entryOld.request,
			text: entryOld.response,
			user: entryOld.user,
			parentHash: entryOld.parent,
			context: entryOld.context,
		};
		messageHistory.add(entryNew);

	}
}

export function loadTopicHistoryFromCurrentMessageHistory(skip: number, count: number): LoadHistoryMessages {
	const logEntries = messageHistory.getList();
	const newEntries = logEntries.map((entry) => {
		return {
			hash: entry.hash,
			parent: entry.parentHash,
			user: entry.user,
			date: entry.date,
			request: entry.request,
			response: entry.text,
			context: entry.context,
		} as LogEntry;
	});

	const logEntriesFlat = newEntries.reverse().slice(skip, skip + count).reverse();
	return {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat,
	} as LoadHistoryMessages;
}

export async function apiKeyInvalidMessage(): Promise<LoadHistoryMessages|undefined> {
	const apiKey = await ApiKeyManager.getApiKey();
	isApiSet = true;
	if (!apiKey) {
		const startMessage = [ apiKeyMissedMessage() ];
		isApiSet = false;
		
		return {
			command: 'loadHistoryMessages',
			entries: startMessage,
		} as LoadHistoryMessages;
	} else {
		return undefined;
	}
}

export async function historyMessagesBase(): Promise<LoadHistoryMessages | undefined> {
	const logEntriesFlat = await loadTopicHistoryLogs();
	if (!logEntriesFlat) {
		return undefined;
	}

	updateCurrentMessageHistory(logEntriesFlat);
	
	const apiKeyMessage = await apiKeyInvalidMessage();
	if (apiKeyMessage !== undefined) {
		return apiKeyMessage;
	}
	
	return {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat.length>0? logEntriesFlat : [welcomeMessage()],
	} as LoadHistoryMessages;
}

export async function onApiKeyBase(apiKey: string): Promise<{command: string, text: string,  hash: string, user: string, date: string, isError: boolean}> {
	if (!isValidApiKey(apiKey)) {
		return { command: 'receiveMessage', text: 'Your API key is invalid. We support OpenAI and DevChat keys. Please reset the key.', hash: '', user: 'system', date: '', isError: false };
	}

	isApiSet = true;
	ApiKeyManager.writeApiKeySecret(apiKey);

	const welcomeMessageText =  welcomeMessage().response;
	return { command: 'receiveMessage', text: `Your OPENAI_API_KEY is set. Enjoy DevChat!\n${welcomeMessageText}`, hash: '', user: 'system', date: '', isError: false };
}