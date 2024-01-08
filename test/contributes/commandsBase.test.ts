// test/commandsBase.test.ts

import { expect } from 'chai';
import * as commonUtil from '../../src/util/commonUtil';
import * as commandsBase from '../../src/contributes/commandsBase';
import sinon from 'sinon';

describe('commandsBase', () => {
  afterEach(() => {
    sinon.restore();
  });
});