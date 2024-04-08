export class Debouncer {
    private debouncing = false;
    private debounceTimeout?: NodeJS.Timeout;
    private lastTimeStampt?: string;

    constructor(private debounceDelay: number) { }

    async debounce(): Promise<boolean> {
        const timestampt = Date.now().toString();
        this.lastTimeStampt = timestampt;
        
        if (this.debouncing) {
            this.debounceTimeout?.refresh();
            const lastTimestampt = await new Promise<string | undefined>((resolve) =>
                setTimeout(() => {
                    resolve(this.lastTimeStampt);
                }, this.debounceDelay)
            );
            return timestampt === lastTimestampt;
        } else {
            this.debouncing = true;
            this.lastTimeStampt = timestampt;
            this.debounceTimeout = setTimeout(() => {
                this.debouncing = false;
            }, this.debounceDelay);
            return true;
        }
    }
}

export default Debouncer;