import * as fs from 'fs';
import * as path from 'path';

import { UiUtilWrapper } from '../util/uiUtil';
import { Action, CustomActions } from './customAction';

import { createTempSubdirectory, runCommandAndWriteOutput } from '../util/commonUtil';
import { logger } from '../util/logger';


export interface ChatAction {
	name: string;
	type: string[];

	description: string;
	action: string;
	handler: (codeBlock: { [key: string]: string }) => Promise<void>;
}

export default class ActionManager {
	private static instance: ActionManager;
	private actions: ChatAction[] = [];

	private constructor() { }

	public static getInstance(): ActionManager {
		if (!ActionManager.instance) {
			ActionManager.instance = new ActionManager();
		}
		return ActionManager.instance;
	}

	public registerAction(action: ChatAction): void {
		this.actions.push(action);
	}

	public getActionList(): ChatAction[] {
		return this.actions;
	}

	public async applyAction(actionName: string, codeBlock: { [key: string]: string }): Promise<void> {
		const action = this.actions.find(action => action.name.trim() === actionName.trim());
		if (action) {
			logger.channel()?.info(`Applying action: ${actionName}`);
			await action.handler(codeBlock);
		}
	}

	public loadCustomActions(workflowsDir: string): void {
		const customActionsInstance = CustomActions.getInstance();
		customActionsInstance.parseActions(workflowsDir);

		for (const customAction of customActionsInstance.getActions()) {
			const chatAction: ChatAction = {
				name: customAction.name,
				type: customAction.type,
				description: customAction.description,
				action: customAction.action,
				handler: async (codeBlock: { [key: string]: string }) => {
					// Implement the handler logic for the custom action
					const tempDir = await createTempSubdirectory('devchat/context');
    				const tempFile = path.join(tempDir, 'apply.json');

					const contextMap = {
						'codeBlock': codeBlock,
						'workspaceDir': UiUtilWrapper.workspaceFoldersFirstPath(),
						'activeFile': UiUtilWrapper.activeFilePath(),
						'selectRang': UiUtilWrapper.selectRange(),
						'secectText': UiUtilWrapper.selectText(),
					};

					// Save contextMap to temp file
					await UiUtilWrapper.writeFile(tempFile, JSON.stringify(contextMap));
					// replace ${contextFile} with tempFile for arg in handler
					const handlerArgs = customAction.handler.map(arg => arg.replace('${contextFile}', tempFile));
					// run handler
					const result = await runCommandAndWriteOutput(handlerArgs[0], handlerArgs.slice(1), undefined);
					logger.channel()?.info(`Applied action: ${customAction.name}`);
					logger.channel()?.info(`  exit code:`, result.exitCode)
					logger.channel()?.info(`  stdout:`, result.stdout);
					logger.channel()?.info(`  stderr:`, result.stderr);

					// remove temp file
					fs.unlinkSync(tempFile);
				},
			};

			this.registerAction(chatAction);
		}
	}
}