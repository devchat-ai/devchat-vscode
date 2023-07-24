// test/apiKey.test.ts

import { expect } from 'chai';
import { ApiKeyManager } from '../../src/util/apiKey';
import { UiUtilWrapper } from '../../src/util/uiUtil';
import sinon from 'sinon';

describe('ApiKeyManager', () => {
  afterEach(() => {
    sinon.restore();
	delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_BASE;
  });

  describe('getApiKey', () => {
    it('should return the secret storage API key', async () => {
      sinon.stub(UiUtilWrapper, 'secretStorageGet').resolves('sk.secret');
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns(undefined);

      const apiKey = await ApiKeyManager.getApiKey();
      expect(apiKey).to.equal('sk.secret');
    });

    it('should return the configuration API key', async () => {
      sinon.stub(UiUtilWrapper, 'secretStorageGet').resolves(undefined);
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns('sk.config');

      const apiKey = await ApiKeyManager.getApiKey();
      expect(apiKey).to.equal('sk.config');
    });

    it('should return the environment variable API key', async () => {
      sinon.stub(UiUtilWrapper, 'secretStorageGet').resolves(undefined);
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns(undefined);
      process.env.OPENAI_API_KEY = 'sk.env';

      const apiKey = await ApiKeyManager.getApiKey();
      expect(apiKey).to.equal('sk.env');
    });
  });

  describe('getEndPoint', () => {
    it('should return the configuration endpoint', () => {
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns('https://config-endpoint.com');

      const endPoint = ApiKeyManager.getEndPoint('sk.key');
      expect(endPoint).to.equal('https://config-endpoint.com');
    });

    it('should return the environment variable endpoint', () => {
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns(undefined);
      process.env.OPENAI_API_BASE = 'https://env-endpoint.com';

      const endPoint = ApiKeyManager.getEndPoint('sk.key');
      expect(endPoint).to.equal('https://env-endpoint.com');
    });

    it('should return the default endpoint for DC keys', () => {
      sinon.stub(UiUtilWrapper, 'getConfiguration').returns(undefined);

      const endPoint = ApiKeyManager.getEndPoint('DC.key');
      expect(endPoint).to.equal('https://api.devchat.ai/v1');
    });
  });

  describe('getKeyType', () => {
    it('should return "sk" for sk keys', () => {
      const keyType = ApiKeyManager.getKeyType('sk.key');
      expect(keyType).to.equal('sk');
    });

    it('should return "DC" for DC keys', () => {
      const keyType = ApiKeyManager.getKeyType('DC.key');
      expect(keyType).to.equal('DC');
    });

    it('should return undefined for invalid keys', () => {
      const keyType = ApiKeyManager.getKeyType('invalid.key');
      expect(keyType).to.be.undefined;
    });
  });

  describe('writeApiKeySecret', () => {
    it('should store the API key in secret storage', async () => {
      const storeSecretStub = sinon.stub(UiUtilWrapper, 'storeSecret').resolves();

      await ApiKeyManager.writeApiKeySecret('sk.secret');
      expect(storeSecretStub.calledWith('devchat_OPENAI_API_KEY', 'sk.secret')).to.be.true;
    });
  });
});