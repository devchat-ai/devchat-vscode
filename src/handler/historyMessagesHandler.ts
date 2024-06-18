import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { loadTopicHistoryFromCurrentMessageHistory } from './historyMessagesBase';
import { DevChatConfig } from '../util/config';



regInMessage({command: 'historyMessages', topicId: '', page: 0});
regOutMessage({command: 'loadHistoryMessages', entries: [{hash: '',user: '',date: '',request: '',response: '',context: [{content: '',role: ''}]}]});
export async function getHistoryMessages(message: {command: string, topicId: string, page: number}, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// if history message has load, send it to webview
	const maxCount = Number(DevChatConfig.getInstance().get('max_log_count'));
	const skip = maxCount * (message.page ? message.page : 0);
	const topicId = message.topicId;

	const historyMessage = await loadTopicHistoryFromCurrentMessageHistory(topicId, skip, maxCount);
	if (historyMessage) {
		MessageHandler.sendMessage(panel, historyMessage);
	}
}

