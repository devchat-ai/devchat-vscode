

import DevChat, { LogEntry, LogOptions } from '../toolwrapper/devchat';
import messageHistory from '../util/messageHistory';
import { ApiKeyManager } from '../util/apiKey';


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
		request: 'Is OPENAI_API_KEY (or DevChat Access Key) ready?',
		response: `
OPENAI_API_KEY is missing from your environment or settings. Kindly input your OpenAI or DevChat key, and I'll ensure DevChat is all set for you.
	
<button value="get_devchat_key" href="https://web.devchat.ai" component="a">Register DevChat key</button>
<button value="setting_devchat_key">Set DevChat key</button>
<button value="setting_openai_key">Set OpenAI key</button>
		`,
		context: []
	} as LogEntry;
}

export function isValidApiKey(apiKey: string, llmType: string = "None") {
	let apiKeyStrim = apiKey.trim();
	const apiKeyType = ApiKeyManager.getKeyType(apiKeyStrim);
	if (apiKeyType === undefined) {
		return false;
	}
	if (llmType === "OpenAI") {
		if (apiKeyType === "sk") {
			return true;
		}
		return false;
	}
	if (llmType === "DevChat") {
		if (apiKeyType === "DC") {
			return true;
		}
		return false;
	}
	return true;
}

export async function loadTopicHistoryLogs(topicId: string | undefined): Promise<Array<LogEntry> | undefined> {
	if (!topicId) {
		return undefined;
	}
	
	const devChat = new DevChat();
	const logOptions: LogOptions = {
		skip: 0,
		maxCount: 10000,
		topic: topicId
	};
	const logEntries = await devChat.log(logOptions);

	return logEntries;
}

export function updateCurrentMessageHistory(topicId: string, logEntries: Array<LogEntry>): void {
	messageHistory.clear();
	messageHistory.setTopic(topicId);

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

export async function historyMessagesBase(topicId: string): Promise<LoadHistoryMessages | undefined> {
	const logEntriesFlat = await loadTopicHistoryLogs(topicId);
	if (!logEntriesFlat) {
		return undefined;
	}

	updateCurrentMessageHistory(topicId, logEntriesFlat);

	return {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat.length > 0 ? logEntriesFlat : [],
	} as LoadHistoryMessages;
}
