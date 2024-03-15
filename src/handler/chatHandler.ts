import { UiUtilWrapper } from '../util/uiUtil';
import { MessageHandler } from './messageHandler';
import { isSending } from './sendMessage';


export async function chatWithDevChat(panel, message: string) {
	if (isSending()) {
		// already sending, show error
		UiUtilWrapper.showErrorMessage("DevChat: A command is already being sent, please try again later.");
		return;
	}
	MessageHandler.sendMessage(panel!, { command: 'chatWithDevChat', 'message': message });
}
