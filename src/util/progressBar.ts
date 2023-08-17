
import * as vscode from 'vscode';

export class ProgressBar {
    private message: string;
	private error: string | undefined;
	private finish: boolean | undefined;

    constructor() {
        this.message = "";
    }

    init() {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'DevChat',
            cancellable: false
        }, (progress, token) => {
            return new Promise<void>((resolve) => {
                const timer = setInterval(() => {
					if (this.finish === true && this.error === "") {
						vscode.window.showInformationMessage(`${this.message}`);
						resolve();
						clearInterval(timer);
					} else if (this.finish === true && this.error !== "") {
						vscode.window.showErrorMessage(`Indexing failed: ${this.error}`);
						resolve();
						clearInterval(timer);
					} else if (this.finish !== true) {
						progress.report({ message: `${this.message}` });
					}
                }, 1000);
            });
        });
    }

    update(message: string, increment?: number) {
        this.message = message;
    }

    end() {
		this.error = "";
		this.finish = true;
    }

    endWithError(error: string) {
		this.error = error;
		this.finish = true;
    }
}
