import * as vscode from 'vscode';
import { DevChatViewProvider } from '../panel/devchatView';
import { TopicTreeDataProvider } from '../panel/topicView';
import ExtensionContextHolder from '../util/extensionContext';


export function regDevChatView(context: vscode.ExtensionContext) {
	ExtensionContextHolder.provider = new DevChatViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('devchat-view', ExtensionContextHolder.provider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);
}

export function regTopicView(context: vscode.ExtensionContext) {
	const yourTreeView = vscode.window.createTreeView('devchat-topicview', {
		treeDataProvider: TopicTreeDataProvider.getInstance(),
	});
	context.subscriptions.push(yourTreeView);
}