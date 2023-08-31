import ChatContextManager from './contextManager';
import { gitDiffCachedContext } from './contextGitDiffCached';
import { gitDiffContext } from './contextGitDiff';
import { customCommandContext } from './contextCustomCommand';
import { refDefsContext } from './contextRefDefs';
import { defRefsContext } from './contextDefRefs';
import { askSummaryContext } from './contextSummary';
import { FT } from '../util/feature_flags/feature_toggles';


const chatContextManager = ChatContextManager.getInstance();

// 注册命令
chatContextManager.registerContext(gitDiffCachedContext);
chatContextManager.registerContext(gitDiffContext);
chatContextManager.registerContext(refDefsContext);
chatContextManager.registerContext(defRefsContext);
chatContextManager.registerContext(customCommandContext);
if (FT("ask-code-summary")) {
	chatContextManager.registerContext(askSummaryContext);
}