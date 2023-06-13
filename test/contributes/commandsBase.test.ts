// test/commandsBase.test.ts

import { expect } from 'chai';
import * as commonUtil from '../../src/util/commonUtil';
import * as commandsBase from '../../src/contributes/commandsBase';
import sinon from 'sinon';

describe('commandsBase', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('checkDevChatDependency', () => {
    it('should return true if DevChat is installed', () => {
      sinon.stub(commonUtil, 'runCommand').callsFake((command: string) => {
        if (command === 'python3 -m pipx environment') {
          return 'PIPX_BIN_DIR=/path/to/bin';
        } else if (command === 'devchat --help') {
          return 'DevChat help text';
        }
        return '';
      });

      const result = commandsBase.checkDevChatDependency("python3");
      expect(result).to.be.true;
    });

    it('should return false if DevChat is not installed', () => {
      sinon.stub(commonUtil, 'runCommand').callsFake((command: string) => {
        if (command === 'python3 -m pipx environment') {
          return 'PIPX_BIN_DIR=/path/to/bin';
        } else if (command === 'devchat --help') {
          throw new Error('Command not found');
        }
        return '';
      });

      const result = commandsBase.checkDevChatDependency("python3");
      expect(result).to.be.false;
    });

    it('should return false if pipx environment is not found', () => {
      sinon.stub(commonUtil, 'runCommand').callsFake((command: string) => {
        if (command === 'python3 -m pipx environment') {
          return 'No pipx environment found';
        }
        return '';
      });

      const result = commandsBase.checkDevChatDependency("python3");
      expect(result).to.be.false;
    });
  });

  describe('getPipxEnvironmentPath', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should return the pipx environment path if found', () => {
      sinon.stub(commonUtil, 'runCommand').callsFake((command: string) => {
        if (command === 'python3 -m pipx environment') {
          return 'PIPX_BIN_DIR=/path/to/bin';
        }
        return '';
      });

      const result = commandsBase.getPipxEnvironmentPath("python3");
      expect(result).to.equal('/path/to/bin');
    });

    it('should return null if pipx environment path is not found', () => {
      sinon.stub(commonUtil, 'runCommand').callsFake((command: string) => {
        if (command === 'python3 -m pipx environment') {
          return 'No pipx environment found';
        }
        return '';
      });

      const result = commandsBase.getPipxEnvironmentPath("python3");
      expect(result).to.be.null;
    });
  });
});