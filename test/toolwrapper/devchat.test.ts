import { expect } from 'chai';
// import { describe, it } from 'mocha';
import sinon from 'sinon';
import DevChat, { ChatOptions } from '../../src/toolwrapper/devchat';
import { CommandRun } from '../../src/util/commonUtil';
import { UiUtilWrapper } from '../../src/util/uiUtil';
import { ApiKeyManager } from '../../src/util/apiKey';

// TODO: 删除devchat.js时，删除此测试文件
// TODO: 同时为 DevChatCLI & DevChatClient 添加测试
describe('DevChat', () => {
  let devChat: DevChat;
  let spawnAsyncStub: sinon.SinonStub;
  let workspaceFoldersFirstPathStub: sinon.SinonStub;
  let apiKeyManagerStub: sinon.SinonStub;

  beforeEach(() => {
    devChat = new DevChat();
    spawnAsyncStub = sinon.stub(CommandRun.prototype, 'spawnAsync');
    workspaceFoldersFirstPathStub = sinon.stub(UiUtilWrapper, 'workspaceFoldersFirstPath');
    apiKeyManagerStub = sinon.stub(ApiKeyManager, 'llmModel');
  });

  afterEach(() => {
    spawnAsyncStub.restore();
    workspaceFoldersFirstPathStub.restore();
    apiKeyManagerStub.restore();
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
        stdout: 'User: Test user\nDate: 2022-01-01\nTest chat response\nprompt-hash: 12345',
        stderr: '',
      };
      const mockWorkspacePath = './';
      const llmModelResponse = {
        "model": "gpt-3.5-turbo",
        "api_key": "DC.1234567890"
      }

      spawnAsyncStub.resolves(mockResponse);
      workspaceFoldersFirstPathStub.returns(mockWorkspacePath);
      apiKeyManagerStub.resolves(llmModelResponse);

			const response = await devChat.chat(content, options, (data)=>{}, false);

      expect(response).to.have.property('prompt-hash', '');
      expect(response).to.have.property('user', '');
      expect(response).to.have.property('date', '');
      expect(response).to.have.property('response', 'Test chat response');
      expect(response).to.have.property('isError', false);
      expect(spawnAsyncStub.calledOnce).to.be.true;
      expect(workspaceFoldersFirstPathStub.calledOnce).to.be.true;
    });

    // Add more test cases for the chat method here
  });

  // ... other test cases
});