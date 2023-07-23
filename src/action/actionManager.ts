import { Action, CustomActions } from './customAction';

import { CommandResult } from '../util/commonUtil';
import { logger } from '../util/logger';




// extend Action
export class CommandRunAction implements Action {
	name: string;
	description: string;
	type: string[];
	action: string;
	handler: string[];
	args: { "name": string, "description": string, "type": string, "as"?: string, "from": string }[];

	constructor() {
		this.name = 'command_run';
		this.description = 'run command';
		this.type = ['command'];
		this.action = 'command_run';
		this.handler = [];
		this.args = [
			{"name": "content", "description": "command json to run", "type": "string", "from": "content.content"},
		];
	}

	async handlerAction(args: {[key: string]: any}): Promise<CommandResult> {
		try {
			const commandData = JSON.parse(args.content);
			const result = await ActionManager.getInstance().applyCommandAction(commandData.command, commandData.args);
			return result;
		} catch (error) {
			logger.channel()?.error('Failed to parse code file content: ' + error);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `Failed to parse code file content: ${error}`};
		}
	}
};

export default class ActionManager {
	private static instance: ActionManager;
	private actions: Action[] = [];

	private constructor() { }

	public static getInstance(): ActionManager {
		if (!ActionManager.instance) {
			ActionManager.instance = new ActionManager();
		}

		ActionManager.instance.registerAction(new CommandRunAction());
		return ActionManager.instance;
	}

	public registerAction(action: Action): void {
		this.actions.push(action);
	}

	public getActionList(): Action[] {
		return this.actions;
	}

	public async applyAction(actionName: string, content: { "command": string,  content: string, fileName: string }): Promise<CommandResult> {
		const action = this.actions.find(action => action.name.trim() === actionName.trim());
		if (!action) {
			logger.channel()?.info(`Action not found: ${actionName}`);
			return {exitCode: -1, stdout: '', stderr: `${actionName} not found in action list: ${this.actions.map(action => action.name)}`};
		}

		logger.channel()?.info(`Apply action: ${actionName}`);

		// action.args define what args should be passed to handler
		// for example:
		// action.args = [
		//	{"name": "arg1", "description": "arg1 description", "type": "string", "from": "content.fileName"}, 
		//  {"name": "arg2", "description": "arg2 description", "type": "string", "from": "content.content.v1"}]
		// then:
		// arg1 = content.fileName
		// arg2 = content.content.v1
		// before use content.content.v1, we should parse content.content first as json

		if (action.args === undefined || action.args.length === 0) {
			// every action should have args, if not, then it is invalid
			logger.channel()?.error(`Action ${actionName} has no args`);
			logger.channel()?.show();
			return {exitCode: -1, stdout: '', stderr: `Action ${actionName} has no args`};
		}

		// construct args for handler
		let args: {[key: string]: any} = {};

		// check whether action.args has x.x.x like from value
		let hasDotDotFrom = false;
		for (const arg of action.args) {
			if (arg.from !== undefined) {
				// if arg.from has two or more dot, then it is x.x.x
				if (arg.from.split('.').length >= 3) {
					hasDotDotFrom = true;
					break;
				}
			}
		}
		
		// if hasDotDotFrom is true, then parse content as json
		if (hasDotDotFrom) {
			try {
				content.content = JSON.parse(content.content);
			} catch (error) {
				logger.channel()?.info(`Parse content as json failed: ${error}`);
				return {exitCode: -1, stdout: '', stderr: `Parse content as json failed: ${error}`};
			}
		}

		

		for (const arg of action.args) {
			let argValue = '';
			if (arg.from !== undefined) {
				// visit arg.from, it is string
				let argFromValue: any = content;
				const argFrom = arg.from.split('.');
				// first item of argFrom is content, so skip it
				for (const argFromItem of argFrom.slice(1)) {
					argFromValue = argFromValue[argFromItem];
				}
				// if argFromValue is undefined, then it is invalid
				if (argFromValue === undefined) {
					logger.channel()?.error(`Action ${actionName} arg ${arg.name} from ${arg.from} is undefined`);
					logger.channel()?.show();
					return {exitCode: -1, stdout: '', stderr: `Action ${actionName} arg ${arg.name} from ${arg.from} is undefined`};
				}
				argValue = argFromValue;
			}
			args[arg.name] = argValue;
		}

		return await action.handlerAction(args);
	}

	public async applyCommandAction(command: string, args: {[key: string]: any}) : Promise<CommandResult> {
		const action = this.actions.find(action => action.name.trim() === command.trim());
		if (!action) {
			logger.channel()?.info(`Action not found: ${command}`);
			return {exitCode: -1, stdout: '', stderr: `${command} not found in action list: ${this.actions.map(action => action.name)}`};
		}

		logger.channel()?.info(`Apply command action: ${command}`);

		return await action.handlerAction(args);
	}

	public loadCustomActions(workflowsDir: string): void {
		const customActionsInstance = CustomActions.getInstance();
		customActionsInstance.parseActions(workflowsDir);

		for (const customAction of customActionsInstance.getActions()) {
			const chatAction: Action = customAction;
			this.registerAction(chatAction);
		}
	}
}