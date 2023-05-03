export interface Command {
    name: string;
    pattern: string;
    description: string;
    handler: (userInput: string) => string;
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
  
    processText(text: string): string {
      let result = text;
  
      this.commands.forEach((commandObj) => {
        const commandPattern = new RegExp(
          `\\/(${commandObj.pattern.replace("{{prompt}}", "(.+?)")})`,
          "g"
        );
  
        result = result.replace(commandPattern, (_, matchedUserInput) => {
          return commandObj.handler(matchedUserInput);
        });
      });
  
      return result;
    }
  }
  
  export default CommandManager;
