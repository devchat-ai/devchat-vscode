import { ChatContext } from './contextManager';

export const exampleContext: ChatContext = {
  name: 'exampleContext',
  description: '这是一个示例上下文',
  handler: async () => {
    return `[context|example file name]`;
  },
};
