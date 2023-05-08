import ChatContextManager from './contextManager';
import { gitDiffCachedContext } from './contextGitDiffCached';
import { gitDiffContext } from './contextGitDiff';
import { customCommandContext } from './contextCustomCommand';

const chatContextManager = ChatContextManager.getInstance();

// 注册命令
chatContextManager.registerContext(gitDiffCachedContext);
chatContextManager.registerContext(gitDiffContext);
chatContextManager.registerContext(customCommandContext);
