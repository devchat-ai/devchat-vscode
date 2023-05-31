import { expect } from 'chai';
import { describe, it } from 'mocha';

import { TopicManager } from '../../src/topic/topicManager';

describe('TopicManager', () => {
	let topicManager: TopicManager;

	beforeEach(() => {
		topicManager = TopicManager.getInstance();
	});

	afterEach(() => {
		// Reset topics and currentTopicId after each test
		topicManager['_topics'] = {};
		topicManager.currentTopicId = undefined;
	});

	it('getInstance should return a singleton instance', () => {
		const instance1 = TopicManager.getInstance();
		const instance2 = TopicManager.getInstance();
		expect(instance1).to.equal(instance2);
	});

	it('createTopic should create a new topic', () => {
		const topic = topicManager.createTopic();
		expect(topic).to.be.not.undefined;
		expect(topic.topicId).to.be.not.undefined;
		expect(topicManager.getTopic(topic.topicId)).to.equal(topic);
	});

	it('getTopicList should return a list of topics', () => {
		const topic1 = topicManager.createTopic();
		const topic2 = topicManager.createTopic();
		const topicList = topicManager.getTopicList();
		expect(topicList).to.include(topic1);
		expect(topicList).to.include(topic2);
	});

	it('setCurrentTopic should set the current topic ID', () => {
		const topic = topicManager.createTopic();
		topicManager.setCurrentTopic(topic.topicId);
		expect(topicManager.currentTopicId).to.equal(topic.topicId);
	});

	it('updateTopic should update the topic with the given properties', () => {
		const topic = topicManager.createTopic();
		const newMessageHash = 'new-message-hash';
		const messageDate = Date.now();
		const requestMessage = 'Request message';
		const responseMessage = 'Response message';

		topicManager.updateTopic(topic.topicId, newMessageHash, messageDate, requestMessage, responseMessage);

		const updatedTopic = topicManager.getTopic(topic.topicId);
		expect(updatedTopic!.name).to.equal(`${requestMessage} - ${responseMessage}`);
		expect(updatedTopic!.firstMessageHash).to.equal(newMessageHash);
		expect(updatedTopic!.lastMessageHash).to.equal(newMessageHash);
		expect(updatedTopic!.lastUpdated).to.equal(messageDate);
	});

	it('updateTopic should not update the topic if the topic does not exist', () => {
		const nonExistentTopicId = 'non-existent-topic-id';
		const newMessageHash = 'new-message-hash';
		const messageDate = Date.now();
		const requestMessage = 'Request message';
		const responseMessage = 'Response message';

		topicManager.updateTopic(nonExistentTopicId, newMessageHash, messageDate, requestMessage, responseMessage);

		const nonExistentTopic = topicManager.getTopic(nonExistentTopicId);
		expect(nonExistentTopic).to.be.undefined;
	});

	it('deleteTopic should delete the topic with the given ID', () => {
		const topic = topicManager.createTopic();
		topicManager.deleteTopic(topic.topicId);
		expect(topicManager.getTopic(topic.topicId)).to.be.undefined;
	  });
	
	  it('deleteTopic should not throw an error if the topic does not exist', () => {
		const nonExistentTopicId = 'non-existent-topic-id';
		expect(() => {
		  topicManager.deleteTopic(nonExistentTopicId);
		}).to.not.throw();
	  });
	
	  it('deleteTopic should set the currentTopicId to undefined if the deleted topic was the current topic', () => {
		const topic = topicManager.createTopic();
		topicManager.setCurrentTopic(topic.topicId);
		topicManager.deleteTopic(topic.topicId);
		expect(topicManager.currentTopicId).to.be.undefined;
	  });
	

	// Add more test cases for other methods in TopicManager
});