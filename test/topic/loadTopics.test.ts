import { expect } from 'chai';
import { describe, it } from 'mocha';
import { LogEntry } from '../../src/toolwrapper/devchat';
import { loadTopicList } from '../../src/topic/loadTopics';

describe('loadTopicList', () => {
  it('should create topic lists from chat logs', () => {
    const chatLogs: LogEntry[] = [
      { hash: '1', parent: '', user: 'user1', date: '2022-01-01', request: 'request1', response: 'response1', context: []},
      { hash: '2', parent: '1', user: 'user2', date: '2022-01-02', request: 'request2', response: 'response2', context: []},
      { hash: '3', parent: '2', user: 'user3', date: '2022-01-03', request: 'request3', response: 'response3', context: []},
      { hash: '4', parent: '', user: 'user4', date: '2022-01-04', request: 'request4', response: 'response4', context: []},
      { hash: '5', parent: '4', user: 'user5', date: '2022-01-05', request: 'request5', response: 'response5', context: []},
    ];

    const expectedTopicLists = {
      '1': [
        { hash: '1', parent: '', user: 'user1', date: '2022-01-01', request: 'request1', response: 'response1', context: []},
        { hash: '2', parent: '1', user: 'user2', date: '2022-01-02', request: 'request2', response: 'response2', context: []},
        { hash: '3', parent: '2', user: 'user3', date: '2022-01-03', request: 'request3', response: 'response3', context: []},
      ],
      '4': [
        { hash: '4', parent: '', user: 'user4', date: '2022-01-04', request: 'request4', response: 'response4', context: []},
        { hash: '5', parent: '4', user: 'user5', date: '2022-01-05', request: 'request5', response: 'response5', context: []},
      ],
    };

    const topicLists = loadTopicList(chatLogs);
    expect(topicLists).to.deep.equal(expectedTopicLists);
  });

  it('should handle empty chat logs', () => {
    const chatLogs: LogEntry[] = [];
    const expectedTopicLists = {};
    const topicLists = loadTopicList(chatLogs);
    expect(topicLists).to.deep.equal(expectedTopicLists);
  });

  it('should handle chat logs with no root entries', () => {
    const chatLogs: LogEntry[] = [
      { hash: '1', parent: '0', user: 'user1', date: '2022-01-01', request: 'request1', response: 'response1', context: []},
      { hash: '2', parent: '1', user: 'user2', date: '2022-01-02', request: 'request2', response: 'response2', context: []},
    ];

    const expectedTopicLists = {};
    const topicLists = loadTopicList(chatLogs);
    expect(topicLists).to.deep.equal(expectedTopicLists);
  });
});