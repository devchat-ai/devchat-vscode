import * as path from 'path';
import { logger } from '../util/logger';

import { createTempSubdirectory } from '../util/commonUtil';
import CustomContexts from './customContext';
import { UiUtilWrapper } from '../util/uiUtil';


export interface ChatContext {
    name: string;
    description: string;
    handler: () => Promise<string[]>;
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
		const existContext = this.contexts.find(c => c.name === context.name);
      	if (!existContext) {
			this.contexts.push(context);
		}
    }

	public async loadCustomContexts(workflowsDir: string): Promise<void> {
		const customContexts = CustomContexts.getInstance();
		customContexts.parseContexts(workflowsDir);
	
		for (const customContext of customContexts.getContexts()) {
			this.registerContext({
				name: customContext.name,
				description: customContext.description,
				handler: async () => {
					const tempDir = await createTempSubdirectory('devchat/context');
    				
					const outputFile = path.join(tempDir, 'context.txt');

					logger.channel()?.info(`running: ${customContext.command.join(' ')}`);
					const commandResult = await customContexts.handleCommand(customContext.name, outputFile);
					
					logger.channel()?.info(`  exit code:`, commandResult!.exitCode);
					logger.channel()?.debug(`  stdout:`, commandResult!.stdout);
					logger.channel()?.debug(`  stderr:`, commandResult!.stderr);

					if (commandResult!.stderr) {
						UiUtilWrapper.showErrorMessage(commandResult!.stderr);
					}
					return [`[context|${outputFile}]`];
				},
			});
		}
	}
  
	getContextList(): ChatContext[] {
      return this.contexts;
    }
  
    async processText(command: string): Promise<string[]> {
        for (const contextObj of this.contexts) {
            if (contextObj.name === command) {
                return await contextObj.handler();
            }
        }
      
        return [];
    }
  }
  
  export default ChatContextManager;
