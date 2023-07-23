
import { Action, CustomActions } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import { UiUtilVscode } from '../util/uiUtil_vscode';
import { UiUtilWrapper } from '../util/uiUtil';


export class AskInputAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "from": string }[];

	constructor() {
		this.name = 'ask_input';
		this.description = 'Ask user a question to when you need the user to input something';
		this.type = ['question'];
		this.action = 'ask_input';
		this.handler = [];
		this.args = [
			{"name": "question", "description": "The question you asked.", "type": "string", "from": "content.content.question"},
		];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const question = args.question;

			const answer: string | undefined = await UiUtilWrapper.showInputBox({
				title: question,
				placeHolder: "Please input your answer here."
			});
			if (answer === undefined) {
				return {exitCode: -1, stdout: '', stderr: ``};
			} else {
				return {exitCode: 0, stdout: answer, stderr: ""};
			}
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};