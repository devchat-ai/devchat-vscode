// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const ChatPanel = require('./chatPanel').default;

function activate(context: { extensionUri: any; subscriptions: any[]; }) {
	let disposable = vscode.commands.registerCommand('devchat.openChatPanel', async () =>  {
		const sessionNames = Object.keys(ChatPanel.sessions());

		const createNewSessionOption = 'Create new session';
		const options = [...sessionNames, createNewSessionOption];

		const selectedOption = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select a session or create a new one',
		});

		if (!selectedOption) {
			return;
		}

		let sessionName = selectedOption;

		if (selectedOption === createNewSessionOption) {
			sessionName = await vscode.window.showInputBox({
			prompt: 'Enter a new session name',
			placeHolder: 'Session Name',
			});

			if (!sessionName) {
				return;
			}
		}

		ChatPanel.createOrShow(context.extensionUri, sessionName);
	  });
	
	  context.subscriptions.push(disposable);
}
exports.activate = activate;

function processMessage(message: any) {
	// For an echo bot, return the same message
	return message;
  }