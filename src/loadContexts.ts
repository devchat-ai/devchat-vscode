import ChatContextManager from './contextManager';
import { exampleContext } from './exampleContext';

const chatContextManager = ChatContextManager.getInstance();

// 注册命令
chatContextManager.registerContext(exampleContext);