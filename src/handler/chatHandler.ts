import { MessageHandler } from './messageHandler';


export async function chatWithDevChat(panel, message: string) {
	MessageHandler.sendMessage(panel!, { command: 'chatWithDevChat', 'message': message });
}
