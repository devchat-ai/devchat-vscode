import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import DevChat, { LogEntry, LogOptions } from '../toolwrapper/devchat';

import { loadTopicList } from './loadTopics';

export class Topic {
	name: string | undefined;
	lastMessageHash: string | undefined;
	lastUpdated: number | undefined;
	firstMessageHash: string | undefined;
	topicId: string;

	constructor();
	constructor(name: string, firstMessageHash: string, topicId: string, lastUpdated: number);
	constructor(name?: string, firstMessageHash?: string, topicId?: string, lastUpdated?: number) {
		if (name && firstMessageHash && topicId) {
			// 从历史数据加载
			this.name = name;
			this.firstMessageHash = firstMessageHash;
			this.lastMessageHash = firstMessageHash;
			this.lastUpdated = lastUpdated;
			this.topicId = topicId;
		} else {
			// 新建
			this.topicId = uuidv4();
		}
	}

	updateFirstMessageHashAndName(newFirstMessageHash: string, newName: string): void {
		this.firstMessageHash = newFirstMessageHash;
		this.name = newName;
	}

	updateLastMessageHashAndLastUpdated(newLastMessageHash: string, newLastUpdated: number): void {
		this.lastMessageHash = newLastMessageHash;
		this.lastUpdated = newLastUpdated;
	}
}

export class TopicManager {
	private static _instance: TopicManager;
	private _topics: { [key: string]: Topic };
	private _currentTopicIdChangeListeners: ((newTopicId: string | undefined) => void)[] = [];
	private _createTopicListeners: ((topic: Topic) => void)[] = [];
	private _deleteTopicListeners: ((topicId: string) => void)[] = [];
	private _reloadTopicsListeners: ((topics: Topic[]) => void)[] = [];
	private _updateTopicListeners: ((topicId: string) => void)[] = [];
	public currentTopicId: string | undefined;
	

	private constructor() {
		this._topics = {};
	}

	public static getInstance(): TopicManager {
		if (!TopicManager._instance) {
			TopicManager._instance = new TopicManager();
		}
		return TopicManager._instance;
	}

	setCurrentTopic(topicId: string | undefined): void {
		this.currentTopicId = topicId;
		this._notifyCurrentTopicIdChangeListeners(topicId);
	}

	getTopicList(): Topic[] {
		/**
		 * 获取topic列表
		 */
		return Object.values(this._topics);
	}

	createTopic(): Topic {
		/**
		 * 新建topic
		 * topicId: 从新建的topic对象中获取
		 */
		const topic = new Topic();
		this._topics[topic.topicId] = topic;
		this._notifyCreateTopicListeners(topic);
		//this.setCurrentTopic(topic.topicId);
		return topic;
	}

	createTopicName(request: string, response: string): string {
		/**
		 * 根据request和response生成topicName
		 */
		return `${request} - ${response}`;
	}

	updateTopic(topicId: string, newMessageHash: string, messageDate: number, requestMessage: string, responseMessage: string): void {
		/**
		 * 更新topic
		 */
		// 如果topic没有设置name，则根据requestMessage和responseM essage生成name，并将newMessageHash设置为firstMessageHash
		// 如果topic已经设置了name，则更新lastMessageHash和lastUpdated
		const topic = this._topics[topicId];
		if (topic) {
			if (!topic.name) {
				// 生成name
				// 使用topic方法进行更新
				const name = this.createTopicName(requestMessage, responseMessage);
				topic.updateFirstMessageHashAndName(newMessageHash, name);
			}

			// 使用topic方法更新lastMessageHash和lastUpdated
			topic.updateLastMessageHashAndLastUpdated(newMessageHash, messageDate);
			this._notifyUpdateTopicListeners(topicId);
		}
	}

	getTopic(topicId: string): Topic | undefined {
		/**
		 * 获取topic
		 */
		return this._topics[topicId];
	}

	addOnCurrentTopicIdChangeListener(listener: (newTopicId: string | undefined) => void): void {
		this._currentTopicIdChangeListeners.push(listener);
	}

	removeOnCurrentTopicIdChangeListener(listener: (newTopicId: string | undefined) => void): void {
		this._currentTopicIdChangeListeners = this._currentTopicIdChangeListeners.filter(l => l !== listener);
	}

	private _notifyCreateTopicListeners(topic: Topic): void {
		this._createTopicListeners.forEach(listener => listener(topic));
	}

	private _notifyDeleteTopicListeners(topicId: string): void {
		this._deleteTopicListeners.forEach(listener => listener(topicId));
	}

	private _notifyUpdateTopicListeners(topicId: string): void {
		this._updateTopicListeners.forEach(listener => listener(topicId));
	}

	addOnUpdateTopicListener(listener: (topicId: string) => void): void {
		this._updateTopicListeners.push(listener);
	}

	removeOnUpdateTopicListener(listener: (topicId: string) => void): void {
		this._updateTopicListeners = this._updateTopicListeners.filter(l => l !== listener);
	}
	private _notifyReloadTopicsListeners(topics: Topic[]): void {
		this._reloadTopicsListeners.forEach(listener => listener(topics));
	}

	addOnCreateTopicListener(listener: (topic: Topic) => void): void {
		this._createTopicListeners.push(listener);
	}

	removeOnCreateTopicListener(listener: (topic: Topic) => void): void {
		this._createTopicListeners = this._createTopicListeners.filter(l => l !== listener);
	}

	addOnDeleteTopicListener(listener: (topicId: string) => void): void {
		this._deleteTopicListeners.push(listener);
	}

	removeOnDeleteTopicListener(listener: (topicId: string) => void): void {
		this._deleteTopicListeners = this._deleteTopicListeners.filter(l => l !== listener);
	}

	addOnReloadTopicsListener(listener: (topics: Topic[]) => void): void {
		this._reloadTopicsListeners.push(listener);
	}

	removeOnReloadTopicsListener(listener: (topics: Topic[]) => void): void {
		this._reloadTopicsListeners = this._reloadTopicsListeners.filter(l => l !== listener);
	}
	private _notifyCurrentTopicIdChangeListeners(newTopicId: string | undefined): void {
		this._currentTopicIdChangeListeners.forEach(listener => listener(newTopicId));
	}

	deleteTopic(topicId: string): void {
		/**
		 * 删除topic
		 */
		// TODO
		// 从底层数据库中删除topic
		// 在.chat/.deletedTopics中记录被删除的topicId
		const topic = this._topics[topicId];
		if (!topic) {
			return;
		}

		if (topic.firstMessageHash) {
			// get ${WORKSPACE_ROOT}/.chat/.deletedTopics
			const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
			const deletedTopicsPath = path.join(workspaceDir!, '.chat', '.deletedTopics');

			// read ${WORKSPACE_ROOT}/.chat/.deletedTopics as String[]
			// add topicId to String[]
			// write String[] to ${WORKSPACE_ROOT}/.chat/.deletedTopics
			let deletedTopics: string[] = [];
			
			if (fs.existsSync(deletedTopicsPath)) {
				deletedTopics = fs.readFileSync(deletedTopicsPath, 'utf-8').split('\n');
			}
			deletedTopics.push(topic.firstMessageHash);
			fs.writeFileSync(deletedTopicsPath, deletedTopics.join('\n'));
		}

		delete this._topics[topicId];
		this._notifyDeleteTopicListeners(topicId);

		if (topicId === this.currentTopicId) {
			this.setCurrentTopic(undefined);
		}
	}

	isDeleteTopic(topicId: string) {
		const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		const deletedTopicsPath = path.join(workspaceDir!, '.chat', '.deletedTopics');

		if (!fs.existsSync(deletedTopicsPath)) {
			return false;
		}

		const deletedTopics = fs.readFileSync(deletedTopicsPath, 'utf-8').split('\n');
		// check whether topicId in deletedTopics
		return deletedTopics.includes(topicId);
	}

	// loadTopics
	// 功能：将DevChat日志根据parentHash进行分组，当前条目与该条目parentHash对应条目归属一组，以此类推，直到parentHash为空
	// 返回值：多个链表，每个链表中当前元素的hash是下一个元素的parentHash
	async loadLogEntries(): Promise<{ [key: string]: LogEntry[] }> {
		// 通过DevChat获取日志
		const devChat = new DevChat();
		const logOptions: LogOptions = {
			skip: 0,
			maxCount: 10000
		};
		const logEntries = await devChat.log(logOptions);
		const logEntriesFlat = logEntries.flat();

		const logTopicLinkedList = loadTopicList(logEntriesFlat);
		return logTopicLinkedList;
	}

	async loadTopics(): Promise<void> {
		// 删除已经加载的topic
		// 重新构建topic信息
		this._topics = {};
		const logEntriesMap = await this.loadLogEntries();
		for (const logEntriesList of Object.values(logEntriesMap)) {
			const topic = new Topic();
			// 使用logEntriesList第一个元素更新topic的firstMessageHash和name
			// 使用logEntriesList最后一个元素更新topic的lastMessageHash和lastUpdated
			if (logEntriesList.length === 0) {
				continue;
			}
			const logEntry = logEntriesList[0];
			const name = this.createTopicName(logEntry.request, logEntry.response);
			topic.updateFirstMessageHashAndName(logEntry.hash, name);
			const lastLogEntry = logEntriesList[logEntriesList.length - 1];
			topic.updateLastMessageHashAndLastUpdated(lastLogEntry.hash, Number(lastLogEntry.date));
			if (topic.firstMessageHash && this.isDeleteTopic(topic.firstMessageHash)) {
				continue;
			}
			this._topics[topic.topicId] = topic;
		}
		this._notifyReloadTopicsListeners(Object.values(this._topics));
	}
	

	async getTopicHistory(topicId: string): Promise<LogEntry[]> {
		/**
		 * 获取topic历史聊天记录
		 */
		// TOPIC对象中firstMessageHash可以作为日志查询的起始点
		// 在DevChat日志中，找出第一个hash为firstMessageHash的日志，然后向下遍历，直到找不到parentHash为当前日志hash的日志
		const topic = this._topics[topicId];
		if (!topic || !topic.firstMessageHash) {
			return [];
		}

		const logEntriesMap = await this.loadLogEntries();
		if (!logEntriesMap[topic.firstMessageHash!]) {
			return [];
		}

		const logEntriesFlat = logEntriesMap[topic.firstMessageHash!];
		return logEntriesFlat;
	}
}
