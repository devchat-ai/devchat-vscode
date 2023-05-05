export interface Command {
    name: string;
    pattern: string;
    description: string;
    handler: (userInput: string) => Promise<string>;
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
      return this.commands;
    }
  
    async processText(text: string): Promise<string> {
        // 定义一个异步函数来处理单个命令
        const processCommand = async (commandObj: Command, userInput: string) => {
          const commandPattern = new RegExp(
            `\\/(${commandObj.pattern.replace('{{prompt}}', '(.+?)')})`,
            'g'
          );
          const matches = Array.from(text.matchAll(commandPattern));
          const replacements = await Promise.all(
            matches.map(async (match) => {
              const matchedUserInput = match[1];
              return await commandObj.handler(matchedUserInput);
            })
          );
          let result = text;
          for (let i = 0; i < matches.length; i++) {
            result = result.replace(matches[i][0], replacements[i]);
          }
          return result;
        };
      
        // 处理所有命令
        let result = text;
        for (const commandObj of this.commands) {
          result = await processCommand(commandObj, result);
        }
      
        return result;
    }  
  }
  
  export default CommandManager;
