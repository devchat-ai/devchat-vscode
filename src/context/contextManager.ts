export interface ChatContext {
    name: string;
    description: string;
    handler: () => Promise<string>;
  }
  
  class ChatContextManager {
    private static instance: ChatContextManager;
    private contexts: ChatContext[] = [];
  
    private constructor() {}
  
    public static getInstance(): ChatContextManager {
      if (!ChatContextManager.instance) {
        ChatContextManager.instance = new ChatContextManager();
      }
  
      return ChatContextManager.instance;
    }
  
    registerContext(context: ChatContext): void {
      this.contexts.push(context);
    }
  
    getContextList(): ChatContext[] {
      return this.contexts;
    }
  
    async processText(command: string): Promise<string> {
        // 处理所有命令
        for (const contextObj of this.contexts) {
            if (contextObj.name == command) {
                return await contextObj.handler();
            }
        }
      
        return '';
    }  
  }
  
  export default ChatContextManager;
