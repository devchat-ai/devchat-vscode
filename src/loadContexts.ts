import ChatContextManager from './contextManager';
import { exampleContext } from './exampleContext';
import { gitDiffCachedContext } from './contextGitDiffCached';
import { gitDiffContext } from './contextGitDiff';
import { customCommandContext } from './contextCustomCommand';

const chatContextManager = ChatContextManager.getInstance();

// 注册命令
chatContextManager.registerContext(exampleContext);
chatContextManager.registerContext(gitDiffCachedContext);
chatContextManager.registerContext(gitDiffContext);
chatContextManager.registerContext(customCommandContext);
