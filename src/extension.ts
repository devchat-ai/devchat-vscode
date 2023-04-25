const vscode = require('vscode');
const ChatPanel = require('./chatPanel').default;

function activate(context: { extensionUri: any; subscriptions: any[]; }) {
  let disposable = vscode.commands.registerCommand('devchat.openChatPanel', () => {
    if (vscode.workspace.workspaceFolders) {
      ChatPanel.createOrShow(context.extensionUri);
    } else {
      vscode.window.showErrorMessage('Please open a directory before using the chat panel.');
    }
  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;
