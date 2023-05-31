
class MessageHistory {
	private history: any[];
	private lastmessage: any | null;

	constructor() {
		this.history = [];
		this.lastmessage = null;
	}

	add(message: any) {
		this.history.push(message);
		this.lastmessage = message;
	}

	find(hash: string) {
		return this.history.find(message => message.hash === hash);
	}
	findLast() {
		return this.lastmessage;
	}

	remove() {
		return;
	}

	clear() {
		this.history = [];
		this.lastmessage = null;
	}
}

const messageHistory = new MessageHistory();
export default messageHistory;
