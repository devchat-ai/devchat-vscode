
export function assertValue(value: any, message: string) {
	if (value) {
		throw new Error(message);
	}
}