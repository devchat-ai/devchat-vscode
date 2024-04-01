import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import fs from 'fs';
import yaml from 'yaml';
import { DevChatConfig } from '../../src/util/config'; // 调整路径以指向config.ts的实际位置
import sinon from 'sinon';
import { logger } from '../../src/util/logger'; // 调整路径以指向logger的实际位置

describe('DevChatConfig', () => {
  let readFileStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let loggerStub: sinon.SinonStub;

  const mockData = {
    username: 'DevUser',
    theme: 'dark',
  };

  beforeEach(() => {
    // Mock fs.readFileSync to return a YAML string based on mockData
    readFileStub = sinon.stub(fs, 'readFileSync').returns(yaml.stringify(mockData));
    
    // Mock fs.writeFileSync to fake the writing process
    writeFileStub = sinon.stub(fs, 'writeFileSync');

    // Mock the logger to prevent logging during tests
    loggerStub = sinon.stub(logger, 'channel').callsFake(() => ({
        info: sinon.fake(),
        warn: sinon.fake(),
        error: sinon.fake(),
        debug: sinon.fake(),
        show: sinon.fake(),
    }));
  });

  afterEach(() => {
    // Restore the original functionalities
    readFileStub.restore();
    writeFileStub.restore();
    loggerStub.restore();
  });

  it('should read config file and get the correct value for a given key', () => {
    const config = new DevChatConfig();
    expect(config.get('username')).to.equal('DevUser');
  });

  it('should set a new key-value pair and write to the config file', () => {
    const config = new DevChatConfig();
    const newKey = 'notifications.enabled';
    const newValue = true;

    config.set(newKey, newValue);

    expect(config.get('notifications.enabled')).to.equal(true);
    // Check if fs.writeFileSync was called
    sinon.assert.calledOnce(writeFileStub);
  });

  it('should handle errors when reading an invalid config file', () => {
    readFileStub.throws(new Error('Failed to read file'));

    // Constructing the config will attempt to read the file and log an error
    const config = new DevChatConfig();

    // Check if the error was logged
    sinon.assert.called(loggerStub);
  });
});