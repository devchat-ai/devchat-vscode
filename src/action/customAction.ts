import fs from 'fs';
import path from 'path';
import { logger } from '../util/logger';
import { CommandResult, createTempSubdirectory, runCommandAndWriteOutput, runCommandStringAndWriteOutput } from '../util/commonUtil';
import { UiUtilWrapper } from '../util/uiUtil';

export interface Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "from": string }[];

	handlerAction: (args: { [key: string]: string }) => Promise<CommandResult>;
}

// generate instruction for action
export function getActionInstruction(action: Action): { name: string, description: string, parameters: any } {
	logger.channel()?.info(`Action Name: ${action.name}`);
	const actionSchema = {
		name: action.name,
		description: action.description,
		parameters: {
			type: "object",
			properties: action.args.reduce((obj: any, arg: any) => {
				obj[arg.name] = {
					type: arg.type,
					description: arg.description
				};
				return obj;
			}, {}),
			required: action.args.filter((arg: any) => arg.required).map((arg: any) => arg.name)
		}
	};

	return actionSchema;
}

export class CustomActions {
	private static instance: CustomActions | null = null;
	private actions: Action[] = [];

	private constructor() {
	}

	public static getInstance(): CustomActions {
		if (!CustomActions.instance) {
			CustomActions.instance = new CustomActions();
		}
		return CustomActions.instance;
	}

	public parseActions(workflowsDir: string): void {
		this.actions = [];

		try {
			const extensionDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => dirent.name);

			for (const extensionDir of extensionDirs) {
				const actionDir = path.join(workflowsDir, extensionDir, 'action');
				if (fs.existsSync(actionDir)) {
					const actionSubDirs = fs.readdirSync(actionDir, { withFileTypes: true })
						.filter(dirent => dirent.isDirectory())
						.map(dirent => dirent.name);

					for (const actionSubDir of actionSubDirs) {
						const settingsPath = path.join(actionDir, actionSubDir, '_setting_.json');
						if (fs.existsSync(settingsPath)) {
							const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
							const action: Action = {
								name: settings.name,
								description: settings.description,
								type: settings.type,
								action: settings.action,
								args: settings.args,
								handler: settings.handler.map((handler: string) => handler.replace('${CurDir}', path.join(actionDir, actionSubDir))),

								handlerAction: async (args: { [key: string]: string }) => {
									// Implement the handler logic for the custom action
									const tempDir = await createTempSubdirectory('devchat/action');
									const tempFile = path.join(tempDir, 'apply.json');

									const contextMap = {
										'codeBlock': args,
										'workspaceDir': UiUtilWrapper.workspaceFoldersFirstPath(),
										'activeFile': UiUtilWrapper.activeFilePath(),
										'selectRang': UiUtilWrapper.selectRange(),
										'secectText': UiUtilWrapper.selectText(),
									};

									// Save contextMap to temp file
									await UiUtilWrapper.writeFile(tempFile, JSON.stringify(contextMap));

									// replace ${contextFile} with tempFile for arg in handler
									let handlerArgs = action.handler.map(arg => arg.replace('${contextFile}', tempFile));
									if (args !== undefined) {
										// visit args, it is {[key: string]: string}
										for (const arg in args) {
											let argValue = args[arg];
											const argDefine = action.args.find(v => v.name === arg);
											if (argDefine !== undefined && argDefine.as !== undefined) {
												// save argValue to temp file
												const tempFile = path.join(tempDir, argDefine.as);
												await UiUtilWrapper.writeFile(tempFile, argValue);
												argValue = tempFile;
											}
											// replace ${arg} with commandObj.args[arg]
											handlerArgs = handlerArgs.map(v => { if (v === '${' + arg + '}') { return argValue; } else { return v; } });
										}
									}
									handlerArgs = handlerArgs.flat();

									// run handler
									let result: CommandResult = { exitCode: -1, stdout: '', stderr: '' };
									if (handlerArgs.length === 1) {
										result = await runCommandStringAndWriteOutput(handlerArgs[0], undefined);
									} else if (handlerArgs.length > 1) {
										result = await runCommandAndWriteOutput(handlerArgs[0], handlerArgs.slice(1), undefined);
									}
									logger.channel()?.info(`Apply action: ${action.name} exit code:`, result.exitCode);
									logger.channel()?.info(`stdout:`, result.stdout);
									logger.channel()?.info(`stderr:`, result.stderr);

									// remove temp file
									if (fs.existsSync(tempFile)) {
										fs.unlinkSync(tempFile);
									}
									return result;
								},
							};
							this.actions.push(action);
						}
					}
				}
			}
		} catch (error) {
			// Show error message
			logger.channel()?.error(`Failed to parse actions: ${error}`);
			logger.channel()?.show();
		}
	}

	public getActions(): Action[] {
		return this.actions;
	}
}