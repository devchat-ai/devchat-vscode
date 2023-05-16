import * as vscode from 'vscode';

class MessageHistory {
	private history: WeakMap<vscode.WebviewPanel|vscode.WebviewView, any[]>;
	private lastmessage: WeakMap<vscode.WebviewPanel|vscode.WebviewView, any>;

	constructor() {
		this.history = new WeakMap();
		this.lastmessage = new WeakMap();
	}

	add(panel: vscode.WebviewPanel|vscode.WebviewView, message: any) {
		if (!this.history.has(panel)) {
			this.history.set(panel, []);
		}
		this.history.get(panel)!.push(message);
		this.lastmessage.set(panel, message);
	}

	find(panel: vscode.WebviewPanel|vscode.WebviewView, hash: string) {
		if (!this.history.has(panel)) {
			return null;
		}
		return this.history.get(panel)!.find(message => message.hash === hash);
	}
	findLast(panel: vscode.WebviewPanel|vscode.WebviewView) {
		if (!this.history.has(panel)) {
			return null;
		}
		return this.lastmessage.get(panel);
	}

	remove(panel: vscode.WebviewPanel|vscode.WebviewView) {
		this.history.delete(panel);
		this.lastmessage.delete(panel);
	}
}

const messageHistory = new MessageHistory();
export default messageHistory;
