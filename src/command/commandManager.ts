import { FT } from "../util/feature_flags/feature_toggles";
import CustomCommands from "./customCommand";

export interface Command {
	name: string;
	pattern: string;
	description: string;
	args: number;
	handler: (commandName: string, userInput: string) => Promise<string>;
}

class CommandManager {
	private static instance: CommandManager;
	private commands: Command[] = [];

	private constructor() { }

	public static getInstance(): CommandManager {
		if (!CommandManager.instance) {
			CommandManager.instance = new CommandManager();
			if (FT("ask-code")) {
				CommandManager.instance.registerCommand({
					name: 'ask-code',
					pattern: 'ask-code',
					description: 'ask code',
					args: 0,
					handler: async (commandName: string, userInput: string) => {
						return '';
					}
				});
			}
		}

		return CommandManager.instance;
	}

	registerCommand(command: Command): void {
		this.commands.push(command);
	}

	getCommandList(includeHide: boolean = false): Command[] {
		// load commands from CustomCommands
		let newCommands: Command[] = [...this.commands];
		const customCommands = CustomCommands.getInstance();
		const commands = customCommands.getCommands();
		commands.forEach(command => {
			const commandObj: Command = {
				name: command.name,
				pattern: command.pattern,
				description: command.description,
				args: command.args,
				handler: async (commandName: string, userInput: string) => {
					return CustomCommands.getInstance().handleCommand(commandName, userInput);
				}
			};
			if (command.show || includeHide) {
				newCommands.push(commandObj);
			}
		});
		return newCommands;
	}

	async processText(text: string): Promise<string> {
		// 定义一个异步函数来处理单个命令
		const processCommand = async (commandObj: Command, userInput: string) => {
			// 转义特殊字符
			let commandPattern: RegExp;
			if (commandObj.pattern.indexOf("{{") > 0) {
				const escapedPattern = commandObj.pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
				commandPattern = new RegExp(
					`\\/(${escapedPattern.replace('\\{\\{prompt\\}\\}', '\\{\\{(.+?)\\}\\}')})`,
					'g'
				);
			} else {
				const escapedPattern = commandObj.pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
				// Update the regex pattern to match commands ending with space or newline
				commandPattern = new RegExp(
					`\\/(?<command>${escapedPattern.replace('{{prompt}}', '(?<userInput>.+?)')})(?=\\s|\\n|$)`,
					'g'
				);
			}


			const matches = Array.from(text.matchAll(commandPattern));
			const replacements = await Promise.all(
				matches.map(async (match) => {
					const matchedUserInput = commandObj.pattern.indexOf("{{") > 0 ? match[2] : match.groups!.userInput;
					return await commandObj.handler(commandObj.name, matchedUserInput);
				})
			);

			let result = userInput;
			for (let i = 0; i < matches.length; i++) {
				result = result.replace(matches[i][0], replacements[i]);
			}
			return result;
		};

		// 处理所有命令
		let result = text;
		for (const commandObj of this.getCommandList(true)) {
			result = await processCommand(commandObj, result);
		}

		return result;
	}
}

export default CommandManager;
