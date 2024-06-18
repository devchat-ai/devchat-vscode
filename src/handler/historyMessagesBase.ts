import DevChat, { LogEntry, LogOptions } from '../toolwrapper/devchat';

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


export async function loadTopicHistoryFromCurrentMessageHistory(topicId: string, skip: number, count: number): Promise< LoadHistoryMessages > {
	const logEntries = await loadTopicHistoryLogs(topicId);
	if (!logEntries) {
		return {
			command: 'loadHistoryMessages',
			entries: [],
		} as LoadHistoryMessages;
	}

	const logEntriesFlat = logEntries.reverse().slice(skip, skip + count).reverse();
	return {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat,
	} as LoadHistoryMessages;
}
