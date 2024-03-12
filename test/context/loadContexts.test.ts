import { expect } from 'chai';
// import { describe, it } from 'mocha';
import '../../src/context/loadContexts';
import { ChatContextManager } from '../../src/context/contextManager';
import { gitDiffCachedContext } from '../../src/context/contextGitDiffCached';
import { gitDiffContext } from '../../src/context/contextGitDiff';
import { customCommandContext } from '../../src/context/contextCustomCommand';

describe('loadContexts', () => {
  it('should register all contexts', () => {
    const chatContextManager = ChatContextManager.getInstance();
    const contextList = chatContextManager.getContextList();

    expect(contextList).to.include(gitDiffCachedContext);
    expect(contextList).to.include(gitDiffContext);
    expect(contextList).to.include(customCommandContext);
  });
});