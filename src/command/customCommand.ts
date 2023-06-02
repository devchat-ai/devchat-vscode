import fs from 'fs';
import path from 'path';
import { logger } from '../util/logger';

export interface Command {
	name: string;
	pattern: string;
	description: string;
	message: string;
	default: boolean;
	show: boolean;
	args: number;
	instructions: string[];
}

class CustomCommands {
	private static instance: CustomCommands | null = null;
	private commands: Command[] = [];

	private constructor() {
	}

	public static getInstance(): CustomCommands {
		if (!CustomCommands.instance) {
			CustomCommands.instance = new CustomCommands();
		}
		return CustomCommands.instance;
	}

	public parseCommands(workflowsDir: string): void {
		this.commands = [];

		try {
			const extensionDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => dirent.name);

			for (const extensionDir of extensionDirs) {
				const commandDir = path.join(workflowsDir, extensionDir, 'command');
				if (fs.existsSync(commandDir)) {
					const commandSubDirs = fs.readdirSync(commandDir, { withFileTypes: true })
						.filter(dirent => dirent.isDirectory())
						.map(dirent => dirent.name);

					for (const commandSubDir of commandSubDirs) {
						const settingsPath = path.join(commandDir, commandSubDir, '_setting_.json');
						if (fs.existsSync(settingsPath)) {
							const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
							const command: Command = {
								name: commandSubDir,
								pattern: settings.pattern,
								description: settings.description,
								message: settings.message,
								default: settings.default,
								args: settings.args === undefined ? 0 : settings.args,
								show: settings.show === undefined ? "true" : settings.show,
								instructions: settings.instructions.map((instruction: string) => path.join(commandDir, commandSubDir, instruction))
							};
							this.commands.push(command);
						}
					}
				}
			}
		} catch (error) {
			// 显示错误消息
			logger.channel()?.error(`Failed to parse commands: ${error}`);
			logger.channel()?.show();
		}
	}

	public regCommand(command: Command) {
		this.commands.push(command);
	}

	public getCommands(): Command[] {
		return this.commands;
	}

	public getCommand(commandName: string): Command | null {
		const foundCommand = this.commands.find(command => command.name === commandName);
		return foundCommand ? foundCommand : null;
	}


	public handleCommand(commandName: string, userInput: string): string {
		// 获取命令对象，这里假设您已经有一个方法或属性可以获取到命令对象
		const command = this.getCommand(commandName);
		if (!command) {
			logger.channel()?.error(`Command ${commandName} not found!`);
			logger.channel()?.show();
			return '';
		}

		let commandMessage = command.message;
		if (userInput && userInput.length > 0) {
			// userInput is "['aa', 'bb]" like string
			// parse userInput to array
			// handle eval exception

			try {
				const userInputArray = eval(userInput);

				// replace command message $1 with userInputArray[0], $2 with userInputArray[1] and so on
				for (let i = 0; i < userInputArray.length; i++) {
					commandMessage = commandMessage.replace(`$${i + 1}`, userInputArray[i]);
				}
			} catch (error) {
				logger.channel()?.error(`Failed to parse user input: ${userInput} error: ${error}`);
				logger.channel()?.show();
				return '';
			}
		}

		// replace ${Name} with enviroment var Name
		const envVarRegex = /\${(\w+)}/g;
		commandMessage = commandMessage.replace(envVarRegex, (match, p1) => {
			return process.env[p1] || '';
		});

		// build instrctions
		const instructions = command!.instructions
			.map((instruction: string) => `[instruction|${instruction}]`)
			.join(' ');

		// 返回结果字符串
		return `${instructions}  ${commandMessage}`;
	}
}

export default CustomCommands;
