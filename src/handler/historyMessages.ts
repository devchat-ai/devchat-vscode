import * as vscode from 'vscode';
import DevChat, { LogOptions, LogEntry } from '../toolwrapper/devchat';
import { MessageHandler } from './messageHandler';
import messageHistory from '../util/messageHistory';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { checkOpenAiAPIKey } from '../contributes/commands';
import ExtensionContextHolder from '../util/extensionContext';
import { TopicManager } from '../topic/topicManager';


let isApiSetted: boolean | undefined = undefined;

interface LoadHistoryMessages {
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


regInMessage({command: 'historyMessages', options: { skip: 0, maxCount: 0 }});
regOutMessage({command: 'loadHistoryMessages', entries: [{hash: '',user: '',date: '',request: '',response: '',context: [{content: '',role: ''}]}]});
export async function historyMessages(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const topicId = TopicManager.getInstance().currentTopicId;
	let logEntriesFlat: Array<LogEntry> = [];
	if (topicId) {
		logEntriesFlat = await TopicManager.getInstance().getTopicHistory(topicId);
	}
	messageHistory.clear();

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
		messageHistory.add(entryNew);
	}

	const isApiKeyReady = await checkOpenAiAPIKey();
	isApiSetted = true;
	if (!isApiKeyReady) {
		const startMessage = [ apiKeyMissedMessage() ];
		isApiSetted = false;

		MessageHandler.sendMessage(panel, {
			command: 'loadHistoryMessages',
			entries: startMessage,
		} as LoadHistoryMessages);
		return;
	}

	const loadHistoryMessages: LoadHistoryMessages = {
		command: 'loadHistoryMessages',
		entries: logEntriesFlat.length>0? logEntriesFlat : [welcomeMessage()],
	};

	MessageHandler.sendMessage(panel, loadHistoryMessages);
	return;
}


export function isValidApiKey(apiKey: string) {
	let apiKeyStrim = apiKey.trim();
	if (apiKeyStrim.indexOf('sk-') !== 0 && apiKeyStrim.indexOf('DC.') !== 0) {
		return false;
	}
	return true;
}

export async function isWaitForApiKey() {
	if (isApiSetted === undefined) {
		isApiSetted = await checkOpenAiAPIKey();
	}
	return !isApiSetted;
}

export async function onApiKey(apiKey: string, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	if (!isValidApiKey(apiKey)) {
		MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: 'Your API key is invalid. We support OpenAI and DevChat keys. Please reset the key.', hash: '', user: 'system', date: '', isError: false });
		return;
	}

	isApiSetted = true;

	const secretStorage: vscode.SecretStorage = ExtensionContextHolder.context?.secrets!;
	secretStorage.store("devchat_OPENAI_API_KEY", apiKey);

	const welcomeMessageText =  welcomeMessage().response;
	MessageHandler.sendMessage(panel, { command: 'receiveMessage', text: `Your OPENAI_API_KEY is set. Enjoy DevChat!\n${welcomeMessageText}`, hash: '', user: 'system', date: '', isError: false });
}

