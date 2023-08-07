import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { historyMessagesBase, LoadHistoryMessages, loadTopicHistoryFromCurrentMessageHistory, onApiKeyBase } from './historyMessagesBase';
import messageHistory from '../util/messageHistory';
import { TopicManager } from '../topic/topicManager';
import { UiUtilWrapper } from '../util/uiUtil';


// startIndex: 可选参数，没有代表最末尾
// 最开始消息索引为0

regInMessage({command: 'historyMessages', length: 0, startIndex: 0});
regOutMessage({command: 'loadHistoryMessages', total: 0, entries: [{hash: '',user: '',date: '',request: '',response: '',context: [{content: '',role: ''}]}]});
export async function historyMessages(message: {command: string, length: number, startIndex: number}, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// if history message has load, send it to webview
	const lenght = message.length;
	if (messageHistory.getTopic() !== TopicManager.getInstance().currentTopicId) {
		const historyMessageAll = await historyMessagesBase();
		if (!historyMessageAll?.entries.length || historyMessageAll?.entries.length <= lenght) {
			MessageHandler.sendMessage(panel, historyMessageAll!);
			return;
		}
	}

	const startIndex = message.startIndex? message.startIndex : 0-lenght; 

	const historyMessage = loadTopicHistoryFromCurrentMessageHistory(startIndex, lenght);
	if (historyMessage) {
		MessageHandler.sendMessage(panel, historyMessage);
	}
}

export async function onApiKey(apiKey: string, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const resMessage = await onApiKeyBase(apiKey);
	MessageHandler.sendMessage(panel, resMessage);
}

