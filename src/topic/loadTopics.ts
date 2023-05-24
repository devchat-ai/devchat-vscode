import DevChat, { LogEntry } from "../toolwrapper/devchat"; 


export class LinkedList {
	logEntries: LogEntry[];

	constructor() {
		this.logEntries = [];
	}

	append(chatLog: LogEntry): void {
		this.logEntries.push(chatLog);
	}
}

export function loadTopicList(chatLogs: LogEntry[]): { [key: string]: LogEntry[] } {
	const topicLists: { [key: string]: LogEntry[] } = {};

	// create map from parent to hash
	// collect logEntry with parent is null
	const parentToHash: { [key: string]: LogEntry } = {};
	const rootHashes: LogEntry[] = [];
	for (const chatLog of chatLogs) {
		if (chatLog.parent) {
			parentToHash[chatLog.parent] = chatLog;
		} else {
			rootHashes.push(chatLog);
		}
	}

	// visite logEntry with parent is null
	// find all children Entries from map, then create LinkedList
	for (const rootHash of rootHashes) {
		const topicList = new LinkedList();
		topicList.append(rootHash);
		let current: LogEntry|undefined = rootHash;
		while (current) {
			const parent: LogEntry = parentToHash[current.hash];
			if (parent) {
				topicList.append(parent);
				current = parent;
			} else {
				current = undefined;
			}
		}
		topicLists[rootHash.hash] = topicList.logEntries;
	}

	return topicLists;
}