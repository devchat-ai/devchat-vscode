import { expect } from 'chai';
import { describe, it } from 'mocha';
import { Context } from 'mocha';
import sinon from 'sinon';
import * as path from 'path';
import { parseMessage, getInstructionFiles, parseMessageAndSetOptions, handleTopic, handlerResponseText, sendMessageBase, stopDevChatBase } from '../../src/handler/sendMessageBase';
import DevChat, { ChatResponse } from '../../src/toolwrapper/devchat';
import CommandManager from '../../src/command/commandManager';
import messageHistory from '../../src/util/messageHistory';
import { TopicManager } from '../../src/topic/topicManager';
import CustomCommands from '../../src/command/customCommand';
import { UiUtilWrapper } from '../../src/util/uiUtil';

import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../../', '.env');
dotenv.config({ path: envPath });

describe('sendMessageBase', () => {
	let workspaceFoldersFirstPathStub: sinon.SinonStub;
	let getConfigurationStub: sinon.SinonStub;

	beforeEach(() => {
		workspaceFoldersFirstPathStub = sinon.stub(UiUtilWrapper, 'workspaceFoldersFirstPath');
		getConfigurationStub = sinon.stub(UiUtilWrapper, 'getConfiguration');
	});

	afterEach(() => {
		workspaceFoldersFirstPathStub.restore();
		getConfigurationStub.restore();
	});

	describe('parseMessage', () => {
		it('should parse message correctly', () => {
			const message = '[context|path/to/context] [instruction|path/to/instruction] [reference|path/to/reference] Hello, world!';
			const result = parseMessage(message);

			expect(result.context).to.deep.equal(['path/to/context']);
			expect(result.instruction).to.deep.equal(['path/to/instruction']);
			expect(result.reference).to.deep.equal(['path/to/reference']);
			expect(result.text).to.equal('Hello, world!');
		});
	});

	describe('getInstructionFiles', () => {
		it('should return instruction files', () => {
			const result = getInstructionFiles();
			expect(result).to.be.an('array');
		});
	});

	describe('parseMessageAndSetOptions', () => {
		it('should parse message and set options correctly', async () => {
			const message = {
				text: '[context|path/to/context] [instruction|path/to/instruction] [reference|path/to/reference] Hello, world!'
			};
			const chatOptions: any = {};

			const result = await parseMessageAndSetOptions(message, chatOptions);

			expect(result.context).to.deep.equal(['path/to/context']);
			expect(result.instruction).to.deep.equal(['path/to/instruction']);
			expect(result.reference).to.deep.equal(['path/to/reference']);
			expect(result.text).to.equal('Hello, world!');
			expect(chatOptions.context).to.deep.equal(['path/to/context']);
			expect(chatOptions.header).to.deep.equal(['path/to/instruction']);
			expect(chatOptions.reference).to.deep.equal(['path/to/reference']);
		});
	});


	describe('handleTopic', () => {
		it('should handle topic correctly', async () => {
			const parentHash = 'somehash';
			const message = {
				text: 'Hello, world!'
			};
			const chatResponse: ChatResponse = {
				response: 'Hello, user!',
				isError: false,
				user: 'user',
				date: '2022-01-01T00:00:00.000Z',
				'prompt-hash': 'responsehash'
			};

			await handleTopic(parentHash, message, chatResponse);
			// Check if the topic was updated correctly
		});
	});

	describe('handlerResponseText', () => {
		it('should handle response text correctly when isError is false', async () => {
			const partialDataText = 'Partial data';
			const chatResponse: ChatResponse = {
				response: 'Hello, user!',
				isError: false,
				user: 'user',
				date: '2022-01-01T00:00:00.000Z',
				'prompt-hash': 'responsehash'
			};

			const result = await handlerResponseText(partialDataText, chatResponse);
			expect(result).to.equal('Hello, user!');
		});

		it('should handle response text correctly when isError is true', async () => {
			const partialDataText = 'Partial data';
			const chatResponse: ChatResponse = {
				response: 'Error occurred!',
				isError: true,
				user: 'user',
				date: '2022-01-01T00:00:00.000Z',
				'prompt-hash': 'responsehash'
			};

			const result = await handlerResponseText(partialDataText, chatResponse);
			expect(result).to.equal('Error occurred!');
		});
	});

	describe('sendMessageBase', async () => {
		it('should send message correct with openai api key', async () => {
			const message = {
				text: 'Hello, world!'
			};
			const handlePartialData = (data: { command: string, text: string, user: string, date: string }) => {
				// Handle partial data
			};

			workspaceFoldersFirstPathStub.returns('./');

			getConfigurationStub.withArgs('DevChat', 'API_KEY').returns(process.env.TEST_OPENAI_API_KEY);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.model').returns('gpt-4');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.temperature').returns(0);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.stream').returns('true');
			getConfigurationStub.withArgs('DevChat', 'llmModel').returns('OpenAI');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.tokensPerPrompt').returns(9000);

			const result = await sendMessageBase(message, handlePartialData);
			expect(result).to.be.an('object');
			expect(result!.command).to.equal('receiveMessage');
			expect(result!.text).to.be.a('string');
			expect(result!.hash).to.be.a('string');
			expect(result!.user).to.be.a('string');
			expect(result!.date).to.be.a('string');
			expect(result!.isError).to.be.false;
		}).timeout(10000);

		it('should send message correct with DevChat access key', async () => {
			const message = {
				text: 'Hello, world!'
			};
			const handlePartialData = (data: { command: string, text: string, user: string, date: string }) => {
				// Handle partial data
			};

			workspaceFoldersFirstPathStub.returns('./');

			getConfigurationStub.withArgs('DevChat', 'API_KEY').returns(process.env.TEST_DEVCHAT_KEY);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.model').returns('gpt-4');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.temperature').returns(0);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.stream').returns('true');
			getConfigurationStub.withArgs('DevChat', 'llmModel').returns('OpenAI');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.tokensPerPrompt').returns(9000);

			const result = await sendMessageBase(message, handlePartialData);
			expect(result).to.be.an('object');
			expect(result!.command).to.equal('receiveMessage');
			expect(result!.text).to.be.a('string');
			expect(result!.hash).to.be.a('string');
			expect(result!.user).to.be.a('string');
			expect(result!.date).to.be.a('string');
			expect(result!.isError).to.be.false;
		}).timeout(10000);

		it('should send message error with invalid api key', async () => {
			const message = {
				text: 'Hello, world!'
			};
			const handlePartialData = (data: { command: string, text: string, user: string, date: string }) => {
				// Handle partial data
			};

			workspaceFoldersFirstPathStub.returns('./');

			getConfigurationStub.withArgs('DevChat', 'API_KEY').returns('sk-KvH7ZCtHmFDCBTqH0jUv');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.model').returns('gpt-4');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.temperature').returns('0');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.stream').returns('true');
			getConfigurationStub.withArgs('DevChat', 'llmModel').returns('OpenAI');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.tokensPerPrompt').returns('9000');

			const result = await sendMessageBase(message, handlePartialData);
			expect(result).to.be.an('object');
			expect(result!.command).to.equal('receiveMessage');
			expect(result!.text).to.be.a('string');
			expect(result!.hash).to.be.a('string');
			expect(result!.user).to.be.a('string');
			expect(result!.date).to.be.a('string');
			expect(result!.isError).to.be.true;
		}).timeout(10000);
	});

	describe('stopDevChatBase', () => {
		it('should stop sendMessageBase correctly', async () => {
			const message = {
				text: 'Hello, world!'
			};
			const handlePartialData = (data: { command: string, text: string, user: string, date: string }) => {
				// Handle partial data
			};

			workspaceFoldersFirstPathStub.returns('./');

			getConfigurationStub.withArgs('DevChat', 'API_KEY').returns(process.env.TEST_DEVCHAT_KEY);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.model').returns('gpt-4');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.temperature').returns(0);
			getConfigurationStub.withArgs('DevChat', 'OpenAI.stream').returns('true');
			getConfigurationStub.withArgs('DevChat', 'llmModel').returns('OpenAI');
			getConfigurationStub.withArgs('DevChat', 'OpenAI.tokensPerPrompt').returns(9000);


			// Start sendMessageBase in a separate Promise
			const sendMessagePromise = sendMessageBase(message, handlePartialData);

			// Wait for a short period to ensure sendMessageBase has started
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Call stopDevChatBase
			const stopMessage = {
				text: 'stop'
			};
			await stopDevChatBase(stopMessage);

			// Check if sendMessageBase has been stopped and returns an error
			try {
				const result = await sendMessagePromise;
				expect(result).to.undefined;
			} catch (error) {
				expect(error).to.be.an('error');
			}
		});
	});
});