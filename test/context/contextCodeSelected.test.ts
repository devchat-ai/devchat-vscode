import { expect } from 'chai';
import { describe, it, afterEach, beforeEach } from 'mocha';
import { handleCodeSelected } from '../../src/context/contextCodeSelected';
import * as path from 'path';
import { UiUtilWrapper } from '../../src/util/uiUtil';
import sinon from 'sinon';

describe('handleCodeSelected', () => {
  let languageIdStub: sinon.SinonStub;
  let workspaceFoldersFirstPathStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;

  beforeEach(() => {
    // Mock UiUtilWrapper functions
    languageIdStub = sinon.stub(UiUtilWrapper, 'languageId').resolves('typescript');
    workspaceFoldersFirstPathStub = sinon.stub(UiUtilWrapper, 'workspaceFoldersFirstPath').returns('test');
    writeFileStub = sinon.stub(UiUtilWrapper, 'writeFile').resolves();
  });

  afterEach(() => {
    // Restore the original functions after each test
    languageIdStub.restore();
    workspaceFoldersFirstPathStub.restore();
    writeFileStub.restore();
  });

  it('should create a context file with the correct content', async () => {
    const fileSelected = path.join(__dirname, 'testFile.ts');
    const codeSelected = 'console.log("Hello, world!");';

    const contextFile = await handleCodeSelected(fileSelected, codeSelected);

    // Check if the mocked functions were called with the correct arguments
    expect(languageIdStub.calledWith(fileSelected)).to.be.true;
    expect(workspaceFoldersFirstPathStub.called).to.be.true;
    expect(writeFileStub.called).to.be.true;

    // Extract the temp file path from the context string
    const tempFilePath = contextFile.match(/\[context\|(.*?)\]/)?.[1];

    expect(tempFilePath).to.not.be.undefined;
  });
});