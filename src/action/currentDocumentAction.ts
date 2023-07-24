
import * as vscode from 'vscode';

import { Action } from './customAction';
import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';
import * as fs from 'fs';

export class CurrentDocumentAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "required": boolean, "from": string }[];

	constructor() {
		this.name = 'current_document';
		this.description = 'Get current active document';
		this.type = ['None'];
		this.action = 'current_document';
		this.handler = [];
		this.args = [];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const editors = vscode.window.visibleTextEditors;
			// get editor with file existed in file system
			const editor = editors.find(editor => fs.existsSync(editor.document.fileName));

			if (editor) {
				const documentText = editor.document.getText();

				const data = {
					path: editor.document.fileName,
					content: documentText
				};
				const jsonData = JSON.stringify(data);

				return {exitCode: 0, stdout: JSON.stringify(data), stderr: ""};
			} else {
				return {exitCode: -1, stdout: "", stderr: "No active editor"};
			}
		} catch (error) {
			logger.channel()?.error(`${this.name} handle error: ${error}`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `${this.name} handle error: ${error}`};
		}
	}
};