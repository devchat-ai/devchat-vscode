import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

import DevChat, { LogEntry, LogOptions } from '../toolwrapper/devchat';

import { UiUtilWrapper } from '../util/uiUtil';
import { logger } from '../util/logger';

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

	updateFirstMessageHashAndName(newFirstMessageHash: string|undefined, newName: string|undefined): void {
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
		this.setCurrentTopic(topic.topicId);
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

	deleteMessage(topicId: string, messageHash: string): void {
		const topic = this._topics[topicId];
		if (topic) {
			topic.updateFirstMessageHashAndName(undefined, "Empty topic");
			topic.lastMessageHash = undefined;
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
			const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
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
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		const deletedTopicsPath = path.join(workspaceDir!, '.chat', '.deletedTopics');

		if (!fs.existsSync(deletedTopicsPath)) {
			return false;
		}

		const deletedTopics = fs.readFileSync(deletedTopicsPath, 'utf-8').split('\n');
		// check whether topicId in deletedTopics
		return deletedTopics.includes(topicId);
	}

	async loadTopics(): Promise<void> {
		if (this.currentTopicId) {
			this.currentTopicId = this.getTopic(this.currentTopicId)?.firstMessageHash;
		}

		this._topics = {};

		const devChat = new DevChat();
		const logEntries: LogEntry[] = await devChat.topics();

		// visite logEntries
		// for each logEntry
		let lastData: number = 0;
		for (const logEntry of logEntries.flat()) {
			lastData += 1;
			const name = this.createTopicName(logEntry.request, logEntry.response);
			const topic = new Topic(name, logEntry.hash, logEntry.hash, Number(logEntry.date));
			topic.updateLastMessageHashAndLastUpdated(logEntry.hash, lastData);
		
			if (topic.firstMessageHash && this.isDeleteTopic(topic.firstMessageHash)) {
				continue;
			}
			this._topics[topic.topicId] = topic;
		}
		this._notifyReloadTopicsListeners(Object.values(this._topics));
	}
}
