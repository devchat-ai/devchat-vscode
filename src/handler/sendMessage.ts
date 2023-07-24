
import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { stopDevChatBase, sendMessageBase, deleteChatMessageBase } from './sendMessageBase';
import { UiUtilWrapper } from '../util/uiUtil';


let _lastMessage: any = undefined;

regInMessage({command: 'sendMessage', text: '', parent_hash: undefined});
regOutMessage({ command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'});
regOutMessage({ command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'});
// message: { command: 'sendMessage', text: 'xxx', hash: 'xxx'}
// return message: 
//     { command: 'receiveMessage', text: 'xxxx', hash: 'xxx', user: 'xxx', date: 'xxx'}
//     { command: 'receiveMessagePartial', text: 'xxxx', user: 'xxx', date: 'xxx'}
export async function sendMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView, function_name: string|undefined = undefined): Promise<void> {
	_lastMessage = [message, function_name];

	const responseMessage = await sendMessageBase(message, (data: { command: string, text: string, user: string, date: string}) => {
		MessageHandler.sendMessage(panel, data, false);
	}, function_name);
	if (responseMessage) {
		MessageHandler.sendMessage(panel, responseMessage);
	}
}

// regeneration last message again
regInMessage({command: 'regeneration'});
export async function regeneration(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// call sendMessage to send last message again
	if (_lastMessage) {
		sendMessage(_lastMessage[0], panel, _lastMessage[1]);
	}
}

regInMessage({command: 'stopDevChat'});
export async function stopDevChat(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	stopDevChatBase(message);
}

regInMessage({command: 'deleteChatMessage', hash: 'xxx'});
regOutMessage({ command: 'deletedChatMessage', hash: 'xxxx'});
export async function deleteChatMessage(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	// prompt user to confirm
	const confirm = await vscode.window.showWarningMessage(
		`Are you sure to delete this message?`,
		{ modal: true },
		'Delete'
	);
	if (confirm !== 'Delete') {
		return;
	}
	
	const deleted = await deleteChatMessageBase(message);
	if (deleted) {
		MessageHandler.sendMessage(panel, { command: 'deletedChatMessage', hash: message.hash });
	} else {
		UiUtilWrapper.showErrorMessage('Delete message failed!');
	}
}



