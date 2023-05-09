import * as vscode from 'vscode';
import DevChat, { LogOptions, LogEntry } from '../toolwrapper/devchat';
import { MessageHandler } from './messageHandler';
import messageHistory from '../util/messageHistory';

interface LoadHistoryMessages {
	command: string;
	entries: Array<LogEntry>;
}

export async function historyMessages(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const devChat = new DevChat();

	const logOptions: LogOptions = message.options || {};
	const logEntries = await devChat.log(logOptions);
	
	const logEntriesFlat = logEntries.flat();
	// TODO handle context
    
	const logEntriesFlatFiltered = logEntriesFlat.map((entry) => {
        return {
			date: entry.date,
			hash: entry.hash,
			request: entry.request,
			text: entry.response,
			user: entry.user,
			parent_hash: '',
		};
    });

	for (let i = 0; i < logEntriesFlat.length; i++) {
		let entryOld = logEntriesFlat[i];
		let entryNew = {
			date: entryOld.date,
			hash: entryOld.hash,
			request: entryOld.request,
			text: entryOld.response,
			user: entryOld.user,
			parent_hash: '',
		};
		if (i > 0) {
			entryNew.parent_hash = logEntriesFlat[i - 1].hash;
		}
		messageHistory.add(panel, entryNew);
	}

	const loadHistoryMessages: LoadHistoryMessages = {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat,
	};

	MessageHandler.sendMessage(panel, loadHistoryMessages);
	return;
}


