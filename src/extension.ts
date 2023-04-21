// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const ChatPanel = require('./chatPanel').default;

function activate(context: { extensionUri: any; subscriptions: any[]; }) {
	let disposable = vscode.commands.registerCommand('devchat.openChatPanel', function () {
		ChatPanel.createOrShow(context.extensionUri);
	  });
	
	  context.subscriptions.push(disposable);
}
exports.activate = activate;

function processMessage(message: any) {
	// For an echo bot, return the same message
	return message;
  }