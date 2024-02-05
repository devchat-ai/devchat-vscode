import * as vscode from 'vscode';
import { TopicManager } from '../topic/topicManager';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';
import DevChat, { TopicEntry } from '../toolwrapper/devchat';

// 注册获取当前topic列表的命令
regInMessage({ command: 'getTopics' });
regOutMessage({ command: 'getTopics', topics: [] });
export async function getTopics(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    const devChat = new DevChat();
	const topicEntries: TopicEntry[] = await devChat.topics();
    MessageHandler.sendMessage(panel, { command: 'getTopics', topicEntries });
}

// 注册删除topic的命令
regInMessage({ command: 'deleteTopic', topicId: '' });
export async function deleteTopic(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    TopicManager.getInstance().deleteTopic(message.topicId);
}
