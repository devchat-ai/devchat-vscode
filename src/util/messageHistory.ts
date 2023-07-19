
export class MessageHistory {
	private history: any[];
	private lastmessage: any | null;
	private topic: string | null;

	constructor() {
		this.history = [];
		this.lastmessage = null;
		this.topic = null;
	}

	setTopic(topic: string) {
		this.topic = topic;
	}

	getTopic() {
		return this.topic;
	}

	add(message: any) {
		this.history.push(message);
		this.lastmessage = message;
	}

	getList() {
		return this.history;
	}

	find(hash: string) {
		return this.history.find(message => message.hash === hash);
	}

	delete(hash: string) {
		const index = this.history.findIndex(message => message.hash === hash);
		if (index >= 0) {
			this.history.splice(index, 1);
		}

		if (this.lastmessage?.hash === hash) {
			this.lastmessage = null;
		}
	}

	findLast() {
		return this.lastmessage;
	}

	clear() {
		this.history = [];
		this.lastmessage = null;
	}
}

const messageHistory = new MessageHistory();
export default messageHistory;
