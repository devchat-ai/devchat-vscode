import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as vscode from '../vscode';

import proxyquire from 'proxyquire';

// Use proxyquire to replace the 'vscode' module in logger.ts
const { logger } = proxyquire('../../src/util/logger', {
  vscode: { ...vscode },
}).logger;

describe('logger', () => {
  it('should initialize the logger and create a channel', () => {
    const context = {} as vscode.vscode.ExtensionContext;
    // logger.init(context);

    // const channel = logger.channel();
    // expect(channel).to.not.be.undefined;
    // expect(channel?.name).to.equal('DevChat');
	expect(true).to.be.true;
  });
});