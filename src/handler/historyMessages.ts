import * as vscode from 'vscode';
import DevChat, { LogOptions, LogEntry } from '../toolwrapper/devchat';
import { MessageHandler } from './messageHandler';
import messageHistory from '../util/messageHistory';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { checkOpenAiAPIKey } from '../contributes/commands';

let isApiSetted: boolean = false;

interface LoadHistoryMessages {
	command: string;
	entries: Array<LogEntry>;
}

function welcomeMessage(): LogEntry {
	// create default logEntry to show welcome message
	return {
		hash: 'message',
		user: 'system',
		date: '',
		request: 'How to use DevChat?',
		response: `
DevChat provides an editing operation method through problem driven development. You can start the journey of using DevChat from the following aspects.
1. Right click to select a file or a piece of code to add to DevChat and try asking AI about the file/code.
2. Use the+button in DevChat to select a git diff message and try using "/commit_message" command to generate a commit message.
		`,
		context: []
	} as LogEntry;
}

function apiKeyMissedMessage(): LogEntry {
	// create default logEntry to show welcome message
	return {
		hash: 'message',
		user: 'system',
		date: '',
		request: 'Is OPENAI_API_KEY ready?',
		response: `
I can't find OPENAI_API_KEY in your environment variables or vscode settings. You can enter your OPENAI_API_KEY, then I can config it for you.
		`,
		context: []
	} as LogEntry;
}

regInMessage({command: 'historyMessages', options: { skip: 0, maxCount: 0 }});
regOutMessage({command: 'loadHistoryMessages', entries: [{hash: '',user: '',date: '',request: '',response: '',context: [{content: '',role: ''}]}]});
export async function historyMessages(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
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
			parentHash: '',
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
			parentHash: '',
		};
		if (i > 0) {
			entryNew.parentHash = logEntriesFlat[i - 1].hash;
		}
		messageHistory.add(panel, entryNew);
	}

	let startMessage = [ welcomeMessage() ];
	const isApiKeyReady = await checkOpenAiAPIKey();
	isApiSetted = true;
	if (!isApiKeyReady) {
		startMessage = [ apiKeyMissedMessage() ];
		isApiSetted = false;
	}

	const loadHistoryMessages: LoadHistoryMessages = {
		command: 'loadHistoryMessages',
		entries: logEntries.length>0? logEntriesFlat : [welcomeMessage()],
	};

	MessageHandler.sendMessage(panel, loadHistoryMessages);
	return;
}


export async function onApiKey(apiKey: string, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	isApiSetted = true;

	const loadHistoryMessages: LoadHistoryMessages = {
		command: 'loadHistoryMessages',
		entries: [welcomeMessage()],
	};

	MessageHandler.sendMessage(panel, loadHistoryMessages);
}