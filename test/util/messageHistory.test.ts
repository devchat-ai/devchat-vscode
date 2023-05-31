import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MessageHistory } from '../../src/util/messageHistory';

describe('MessageHistory', () => {
  let messageHistory: MessageHistory;

  beforeEach(() => {
    messageHistory = new MessageHistory();
  });

  it('add message', () => {
    const message = { hash: '123', content: 'Hello' };
    messageHistory.add(message);
    expect(messageHistory.find('123')).to.deep.equal(message);
  });

  it('find message by hash', () => {
    const message1 = { hash: '123', content: 'Hello' };
    const message2 = { hash: '456', content: 'World' };
    messageHistory.add(message1);
    messageHistory.add(message2);
    expect(messageHistory.find('123')).to.deep.equal(message1);
    expect(messageHistory.find('456')).to.deep.equal(message2);
  });

  it('find last message', () => {
    const message1 = { hash: '123', content: 'Hello' };
    const message2 = { hash: '456', content: 'World' };
    messageHistory.add(message1);
    messageHistory.add(message2);
    expect(messageHistory.findLast()).to.deep.equal(message2);
  });

  it('clear history', () => {
    const message1 = { hash: '123', content: 'Hello' };
    const message2 = { hash: '456', content: 'World' };
    messageHistory.add(message1);
    messageHistory.add(message2);
    messageHistory.clear();
    expect(messageHistory.find('123')).to.be.undefined;
    expect(messageHistory.find('456')).to.be.undefined;
    expect(messageHistory.findLast()).to.be.null;
  });
});