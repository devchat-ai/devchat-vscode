import { vs } from "react-syntax-highlighter/dist/esm/styles/hljs";
import CustomCommands from "./customCommand";
import { logger } from "../util/logger";
import * as vscode from 'vscode';
import * as path from 'path';

export interface Command {
    name: string;
    pattern: string;
    description: string;
    handler: (commandName: string, userInput: string) => Promise<string>;
  }
  
  class CommandManager {
    private static instance: CommandManager;
    private commands: Command[] = [];
  
    private constructor() {}
  
    public static getInstance(): CommandManager {
      if (!CommandManager.instance) {
        CommandManager.instance = new CommandManager();
      }
  
      return CommandManager.instance;
    }
  
    registerCommand(command: Command): void {
      this.commands.push(command);
    }
  
    getCommandList(): Command[] {
		// load commands from CustomCommands
		let newCommands: Command[] = [...this.commands];
		const customCommands = CustomCommands.getInstance();
		const commands = customCommands.getCommands();
		commands.forEach(command => {
			const commandObj: Command = {
				name: command.name,
				pattern: command.pattern,
				description: command.description,
				handler: async (commandName: string, userInput: string) => {
					return CustomCommands.getInstance().handleCommand(commandName);
				}
			};
			newCommands.push(commandObj);
		});
      return newCommands;
    }
  
    async processText(text: string): Promise<string> {
        // 定义一个异步函数来处理单个命令
        const processCommand = async (commandObj: Command, userInput: string) => {
		// 转义特殊字符
		const escapedPattern = commandObj.pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		const commandPattern = new RegExp(
			`\\/(${escapedPattern.replace('{{prompt}}', '(.+?)')})`,
			'g'
		);

		const matches = Array.from(text.matchAll(commandPattern));
		const replacements = await Promise.all(
			matches.map(async (match) => {
			const matchedUserInput = match[1];
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
        for (const commandObj of this.getCommandList()) {
          result = await processCommand(commandObj, result);
        }
      
        return result;
    }  
  }
  
  export default CommandManager;
