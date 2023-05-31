import { expect } from 'chai';
import { describe, it } from 'mocha';
import sinon from 'sinon';
import DevChat, { ChatOptions } from '../../src/toolwrapper/devchat';
import { CommandRun } from '../../src/util/commonUtil';
import { UiUtilWrapper } from '../../src/util/uiUtil';

describe('DevChat', () => {
  let devChat: DevChat;
  let spawnAsyncStub: sinon.SinonStub;
  let workspaceFoldersFirstPathStub: sinon.SinonStub;

  beforeEach(() => {
    devChat = new DevChat();
    spawnAsyncStub = sinon.stub(CommandRun.prototype, 'spawnAsync');
    workspaceFoldersFirstPathStub = sinon.stub(UiUtilWrapper, 'workspaceFoldersFirstPath');
  });

  afterEach(() => {
    spawnAsyncStub.restore();
    workspaceFoldersFirstPathStub.restore();
  });


  describe('chat', () => {
    it('should return a ChatResponse object with isError false when the chat is successful', async () => {
      const content = 'Test chat content';
      const options: ChatOptions = {
        // Provide mock values for the options
        parent: 'parent_value',
        reference: ['ref1', 'ref2'],
        header: ['header1', 'header2'],
        context: ['context1', 'context2'],
      };
      const mockResponse = {
        exitCode: 0,
        stdout: 'User: Test user\nDate: 2022-01-01\nprompt-hash: 12345\nTest chat response',
        stderr: '',
      };
      const mockWorkspacePath = './';

      spawnAsyncStub.resolves(mockResponse);
      workspaceFoldersFirstPathStub.returns(mockWorkspacePath);

			const response = await devChat.chat(content, options, (data)=>{});

      expect(response).to.have.property('prompt-hash', '12345');
      expect(response).to.have.property('user', 'Test user');
      expect(response).to.have.property('date', '2022-01-01');
      expect(response).to.have.property('response', 'Test chat response');
      expect(response).to.have.property('isError', false);
      expect(spawnAsyncStub.calledOnce).to.be.true;
      expect(workspaceFoldersFirstPathStub.calledOnce).to.be.true;
    });

    // Add more test cases for the chat method here
  });

  // ... other test cases
});