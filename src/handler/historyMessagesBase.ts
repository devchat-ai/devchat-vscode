import { DevChatClient, ShortLog } from '../toolwrapper/devchatClient';

export interface LogEntry {
	hash: string;
	parent: string | null;
	user: string;
	date: string;
	request: string;
	response: string;
	context: Array<{
		content: string;
		role: string;
	}>;
}

export interface LoadHistoryMessages {
	command: string;
	entries: Array<LogEntry>;
}

async function loadTopicHistoryLogs(topicId: string | undefined): Promise<Array<LogEntry> | undefined> {
	if (!topicId) {
		return undefined;
	}

	const dcClient = new DevChatClient();
	const shortLogs: ShortLog[] = await dcClient.getTopicLogs(topicId, 10000, 0);

	const logEntries: Array<LogEntry> = [];
	for (const shortLog of shortLogs) {
		const logE: LogEntry = {
			hash: shortLog.hash,
			parent: shortLog.parent,
			user: shortLog.user,
			date: shortLog.date,
			request: shortLog.request,
			response: shortLog.responses[0],
			context: shortLog.context,
		};
			
		logEntries.push(logE);
	}

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
