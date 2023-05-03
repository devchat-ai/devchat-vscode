import {Command} from './commandManager';

export const exampleCommand2: Command = {
  name: 'exampleCommand2',
  pattern: 'example: command2 {{prompt}}',
  description: '这是一个示例命令2',
  handler: (userInput: string) => {
    return `示例命令2处理了以下文本：${userInput}`;
  },
};
