import * as vscode from 'vscode';

import { TopicManager, Topic } from '../topic/topicManager';


export class TopicTreeItem extends vscode.TreeItem {
    id: string;
    date: number | undefined;
    constructor(label: string, id: string, date: number | undefined, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.id = id;
        this.date = date;
        this.iconPath = new vscode.ThemeIcon('symbol-variable');
        this.contextValue = 'yourTreeItem';
    }
	uncheck() {
		this.iconPath = new vscode.ThemeIcon('symbol-variable');
	}
	check() {
		this.iconPath = new vscode.ThemeIcon('check');
	}
}

export class TopicTreeDataProvider implements vscode.TreeDataProvider<TopicTreeItem> {
    private static instance: TopicTreeDataProvider;

    public static getInstance(): TopicTreeDataProvider {
        if (!TopicTreeDataProvider.instance) {
            TopicTreeDataProvider.instance = new TopicTreeDataProvider();
        }
        return TopicTreeDataProvider.instance;
    }

    private _onDidChangeTreeData: vscode.EventEmitter<TopicTreeItem | undefined | null | void> = new vscode.EventEmitter<TopicTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TopicTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    public selectedItem: TopicTreeItem | null = null;
    private items: TopicTreeItem[] = [];

    // reg listeners to TopicManager in constructor
    private constructor() {
        TopicManager.getInstance().addOnCreateTopicListener(this.addItem.bind(this));
        TopicManager.getInstance().addOnDeleteTopicListener(this.onDeleteTopic.bind(this));
        TopicManager.getInstance().addOnReloadTopicsListener(this.onReloadTopics.bind(this));
        TopicManager.getInstance().addOnUpdateTopicListener(this.onUpdateTopics.bind(this));
    }

    // sort items
    private sortItems() {
        this.items.sort((a, b) => {
            if (a.date && b.date) {
                return b.date - a.date;
            } else if (!a.date) {
                return -1;
            } else if (!b.date) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    onUpdateTopics(topicId: string) {
        const items = this.items.filter(i => i.id === topicId);
        const topic = TopicManager.getInstance().getTopic(topicId);
        items.map((item) => {
            item.label = topic?.name;
            item.date = topic?.lastUpdated;
        });
        this.sortItems();
        this._onDidChangeTreeData.fire();
    }

    onReloadTopics(topics: Topic[]) {
        const items = topics.map((topic) => {
            return new TopicTreeItem(topic.name ? topic.name : "new topic", topic.topicId, topic.lastUpdated, vscode.TreeItemCollapsibleState.None);
        });
        this.items = items;
        this.sortItems();
        this._onDidChangeTreeData.fire();
    }

    onDeleteTopic(topicId: string) {
        this.items = this.items.filter(i => i.id !== topicId);
        this.sortItems();
        this._onDidChangeTreeData.fire();
    }

    setSelectedItem(item: TopicTreeItem): void {
		this.items.map((item) => {
			item.uncheck();
		});
		item.check();
        this.selectedItem = item;
		this._onDidChangeTreeData.fire();
    }

    getChildren(element?: TopicTreeItem): vscode.ProviderResult<TopicTreeItem[]> {
        return this.items;
    }

    getTreeItem(element: TopicTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        element.command = {
            title: 'Select Item',
            command: 'devchat-topicview.selectTopic',
            arguments: [element],
        };
        return element;
    }

    reload(): void {
        const topicList = TopicManager.getInstance().getTopicList();
        this.onReloadTopics(topicList);
    }

    addItem(topic: Topic): void {
        const newItem = new TopicTreeItem(topic.name ? topic.name : "new topic", topic.topicId, topic.lastUpdated, vscode.TreeItemCollapsibleState.None);
        this.items.push(newItem);
        this.sortItems();
        this._onDidChangeTreeData.fire();
    }

	
    deleteItem(item: TopicTreeItem): void {
        this.items = this.items.filter(i => i !== item);
        this.sortItems();
        this._onDidChangeTreeData.fire();
    }
}