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

  describe('getKeyType', () => {
    it('should return "sk" for sk keys', () => {
      const keyType = ApiKeyManager.getKeyType('sk-key');
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
});