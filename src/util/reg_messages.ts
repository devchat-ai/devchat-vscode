
let inMessages: object[] = [];
let outMessages: object[] = [];

export function regInMessage(message: object) {
	inMessages.push(message);
}

export function regOutMessage(message: object) {
	outMessages.push(message);
}

export function getInMessages(): object[] {
	return inMessages;
}

export function getOutMessages(): object[] {
	return outMessages;
}