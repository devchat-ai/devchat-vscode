
export interface LogChannel {
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string | Error, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	show(): void;
}

export class logger {
	private static _channel: LogChannel | undefined;
	public static init(channel: LogChannel): void {
		this._channel = channel;
	}

	public static channel(): LogChannel | undefined {
		return this._channel;
	}
}

