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
	const topicEntriesAll: TopicEntry[] = await devChat.topics();

    let topicEntries: TopicEntry[] = [];
    for (const topicEntry of topicEntriesAll) {
        if (TopicManager.getInstance().isDeleteTopic(topicEntry.root_prompt.hash)) {
            continue;
        }
        // append topicEntry to topicEntries
        topicEntries.push(topicEntry);
    }

    MessageHandler.sendMessage(panel, { command: 'getTopics', topicEntries });
}

// 注册删除topic的命令
regInMessage({ command: 'deleteTopic', topicId: '' });
export async function deleteTopic(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    TopicManager.getInstance().deleteTopic(message.topicId);
}
