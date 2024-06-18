import * as path from 'path';
import { logger } from '../util/logger';

import { createTempSubdirectory } from '../util/commonUtil';
import { UiUtilWrapper } from '../util/uiUtil';


export interface ChatContext {
    name: string;
    description: string;
    handler: () => Promise<string[]>;
}

export class ChatContextManager {
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
		const existContext = this.contexts.find(c => c.name === context.name);
      	if (!existContext) {
			this.contexts.push(context);
		}
    }

	getContextList(): ChatContext[] {
      return this.contexts;
    }
  
    async handleContextSelected(command: string): Promise<string[]> {
        for (const contextObj of this.contexts) {
            if (contextObj.name === command) {
                return await contextObj.handler();
            }
        }
      
        return [];
    }
}
