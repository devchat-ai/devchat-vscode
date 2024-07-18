import * as vscode from "vscode";

import { regInMessage, regOutMessage } from "../util/reg_messages";
import { MessageHandler } from "./messageHandler";
import { DevChatClient } from "../toolwrapper/devchatClient";
import { LogEntry } from "./historyMessagesBase";

const dcClient = new DevChatClient();

export interface TopicEntry {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    root_prompt: LogEntry;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    latest_time: number;
    hidden: boolean;
    title: string | null;
}

// 注册获取当前topic列表的命令
regInMessage({ command: "getTopics" });
regOutMessage({ command: "getTopics", topics: [] });
export async function getTopics(
    message: any,
    panel: vscode.WebviewPanel | vscode.WebviewView
): Promise<void> {
    const topics = await dcClient.getTopics(100, 0);
    const entries: TopicEntry[] = [];

    for (const topic of topics) {
        const rootLog: LogEntry = {
            hash: topic.root_prompt_hash,
            parent: topic.root_prompt_parent,
            user: topic.root_prompt_user,
            date: topic.root_prompt_date,
            request: topic.root_prompt_request,
            response: topic.root_prompt_response,
            context: [],
        };
        const e: TopicEntry = {
            root_prompt: rootLog,
            latest_time: topic.latest_time,
            hidden: topic.hidden,
            title: topic.title,
        };
        entries.push(e);
    }

    MessageHandler.sendMessage(panel, {
        command: "getTopics",
        topicEntries: entries,
    });
}

// 注册删除topic的命令
regInMessage({ command: "deleteTopic", topicId: "" });
export async function deleteTopic(
    message: any,
    panel: vscode.WebviewPanel | vscode.WebviewView
): Promise<void> {
    const topicId = message.topicId;
    await dcClient.deleteTopic(topicId);
}
