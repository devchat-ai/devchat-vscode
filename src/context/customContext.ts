import fs from 'fs';
import path from 'path';
import { logger } from '../util/logger';

import { runCommandStringArrayAndWriteOutput, runCommandStringAndWriteOutputSync, CommandResult } from '../util/commonUtil';
import { UiUtilWrapper } from '../util/uiUtil';


export interface CustomContext {
	name: string;
	description: string;
	command: string[];
	edit: boolean | undefined;
	path: string;
}

class CustomContexts {
	private static instance: CustomContexts | null = null;
	private contexts: CustomContext[] = [];

	private constructor() {
	}

	public static getInstance(): CustomContexts {
		if (!CustomContexts.instance) {
			CustomContexts.instance = new CustomContexts();
		}
		return CustomContexts.instance;
	}

	public parseContexts(workflowsDir: string): void {
		this.contexts = [];

		try {
			const extensionDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => dirent.name);

			for (const extensionDir of extensionDirs) {
				const contextDirPath = path.join(workflowsDir, extensionDir, 'context');
				if (fs.existsSync(contextDirPath)) {
					const contextDirs = fs.readdirSync(contextDirPath, { withFileTypes: true })
						.filter(dirent => dirent.isDirectory())
						.map(dirent => dirent.name);

					for (const contextDir of contextDirs) {
						const settingsPath = path.join(contextDirPath, contextDir, '_setting_.json');
						if (fs.existsSync(settingsPath)) {
							const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
							const context: CustomContext = {
								name: settings.name,
								description: settings.description,
								command: settings.command,
								edit: settings.edit,
								path: path.join(contextDirPath, contextDir)
							};
							this.contexts.push(context);
						}
					}
				}
			}
		} catch (error) {
			logger.channel()?.error(`Failed to parse contexts: ${error}`);
			logger.channel()?.show();
		}
	}

	public getContexts(): CustomContext[] {
		return this.contexts;
	}

	public getContext(contextName: string): CustomContext | null {
		const foundContext = this.contexts.find(context => context.name === contextName);
		return foundContext ? foundContext : null;
	}

	public async handleCommand(contextName: string, outputFile: string): Promise<CommandResult | null> {
		const context = this.getContext(contextName);
		if (!context) {
			logger.channel()?.error(`Context not found: ${contextName}`);
			logger.channel()?.show();
			return null;
		}

		const contextDir = context.path;
		const commandArray = context.command.slice(); // Create a copy of the command array
		commandArray.forEach((arg, index) => {
			commandArray[index] = arg.replace('${CurDir}', contextDir);
		});

		if (commandArray.length === 1) {
			if (context.edit === true) {
				// prompt input box for user to edit the commandArray[0]
				const newCommand: string | undefined = await UiUtilWrapper.showInputBox({
					placeHolder: 'Edit the command',
					value: commandArray[0]
				});
				if (!newCommand) {
					return { exitCode: 1, stdout: '', stderr: 'Command is empty' };
				}
				return runCommandStringAndWriteOutputSync(newCommand!, outputFile);
			}
			return runCommandStringAndWriteOutputSync(commandArray[0], outputFile);
		}
		return await runCommandStringArrayAndWriteOutput(commandArray, outputFile);
	}
}

export default CustomContexts;