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
			const subDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => dirent.name);

			for (const dir of subDirs) {
				const settingsPath = path.join(workflowsDir, dir, '_setting_.json');
				if (fs.existsSync(settingsPath)) {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
					const command: Command = {
						name: dir,
						pattern: settings.pattern,
						description: settings.description,
						message: settings.message,
						default: settings.default,
						show: settings.show === undefined ? "true" : settings.show,
						instructions: settings.instructions
					};
					this.commands.push(command);
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


	public handleCommand(commandName: string): string {
		// 获取命令对象，这里假设您已经有一个方法或属性可以获取到命令对象
		const command = this.getCommand(commandName);
		if (!command) {
			logger.channel()?.error(`Command ${commandName} not found!`);
			logger.channel()?.show();
			return '';
		}

		// 构建instructions列表字符串
		const instructions = command!.instructions
			.map((instruction: string) => `[instruction|./.chat/workflows/${command.name}/${instruction}]`)
			.join(' ');

		// 返回结果字符串
		return `${instructions}  ${command!.message}`;
	}
}

export default CustomCommands;
