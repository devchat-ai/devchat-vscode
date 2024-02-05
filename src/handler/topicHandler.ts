import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { MessageHandler } from './messageHandler';
import DevChat, { TopicEntry } from '../toolwrapper/devchat';
import { UiUtilWrapper } from '../util/uiUtil';



function isDeleteTopic(topicId: string) {
    let workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspaceDir) {
        workspaceDir = os.homedir();
    }
    const deletedTopicsPath = path.join(workspaceDir!, '.chat', '.deletedTopics');

    if (!fs.existsSync(deletedTopicsPath)) {
        return false;
    }

    const deletedTopics = fs.readFileSync(deletedTopicsPath, 'utf-8').split('\n');
    // check whether topicId in deletedTopics
    return deletedTopics.includes(topicId);
}

// 注册获取当前topic列表的命令
regInMessage({ command: 'getTopics' });
regOutMessage({ command: 'getTopics', topics: [] });
export async function getTopics(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
    const devChat = new DevChat();
	const topicEntriesAll: TopicEntry[] = await devChat.topics();

    let topicEntries: TopicEntry[] = [];
    for (const topicEntry of topicEntriesAll) {
        if (isDeleteTopic(topicEntry.root_prompt.hash)) {
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
    const topicId = message.topicId;
    let workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspaceDir) {
        workspaceDir = os.homedir();
    }
    const deletedTopicsPath = path.join(workspaceDir!, '.chat', '.deletedTopics');

    // read ${WORKSPACE_ROOT}/.chat/.deletedTopics as String[]
    // add topicId to String[]
    // write String[] to ${WORKSPACE_ROOT}/.chat/.deletedTopics
    let deletedTopics: string[] = [];
    
    if (fs.existsSync(deletedTopicsPath)) {
        deletedTopics = fs.readFileSync(deletedTopicsPath, 'utf-8').split('\n');
    }
    deletedTopics.push(topicId);
    fs.writeFileSync(deletedTopicsPath, deletedTopics.join('\n'));
}
