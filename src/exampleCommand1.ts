import {Command} from './commandManager';

export const exampleCommand1: Command = {
  name: 'exampleCommand1',
  pattern: 'example: command1 {{prompt}}',
  description: '这是一个示例命令1',
  handler: (userInput: string) => {
    return `示例命令1处理了以下文本：${userInput}`;
  },
};
