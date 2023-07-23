import { expect } from 'chai';
import 'mocha';
import ActionManager from '../../src/action/actionManager';
import { Action } from '../../src/action/customAction';

describe('ActionManager', () => {
	const testAction: Action = {
		name: 'testAction',
		description: 'Test action for unit testing',
		type: ['test'],
		action: 'test',
		handler: [],
		args: [],
		handlerAction: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
	};

	it('should register and retrieve actions', () => {
		const actionManager = ActionManager.getInstance();
		actionManager.registerAction(testAction);
		const actionList = actionManager.getActionList();
		expect(actionList).to.contain(testAction);
	});

	it('should return an error for action with empty args', async () => {
		const actionManager = ActionManager.getInstance();
		const testActionWithEmptyArgs: Action = {
			...testAction,
			name: 'testActionWithEmptyArgs',
			args: [],
		};
		actionManager.registerAction(testActionWithEmptyArgs);
		const actionName = 'testActionWithEmptyArgs';
		const content = {
			command: 'test',
			content: 'test content',
			fileName: 'test.txt',
		};
		const result = await actionManager.applyAction(actionName, content);
		expect(result.exitCode).to.equal(-1);
		expect(result.stdout).to.equal('');
		expect(result.stderr).to.equal('Action testActionWithEmptyArgs has no args');
	});
	it('should apply action with valid args correctly', async () => {
		const actionManager = ActionManager.getInstance();
		const testActionWithArgs: Action = {
			...testAction,
			name: 'testActionWithArgs',
			args: [
				{
					name: 'arg1',
					description: 'arg1 description',
					type: 'string',
					from: 'content.fileName',
				},
			],
		};
		actionManager.registerAction(testActionWithArgs);
		const actionName = 'testActionWithArgs';
		const content = {
			command: 'test',
			content: 'test content',
			fileName: 'test.txt',
		};
		const result = await actionManager.applyAction(actionName, content);
		expect(result.exitCode).to.equal(0);
		expect(result.stdout).to.equal('');
		expect(result.stderr).to.equal('');
	});
});