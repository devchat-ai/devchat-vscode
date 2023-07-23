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

    it('should apply action with content.content.xxx type args correctly', async () => {
        const actionManager = ActionManager.getInstance();
        const testActionWithNestedArgs: Action = {
            ...testAction,
            name: 'testActionWithNestedArgs',
            args: [
                {
                    name: 'arg1',
                    description: 'arg1 description',
                    type: 'string',
                    from: 'content.content.field1',
                },
            ],
            handlerAction: async (args) => {
                if (args.arg1 === 'value1') {
                    return { exitCode: 0, stdout: '', stderr: '' };
                } else {
                    return { exitCode: -1, stdout: '', stderr: 'Incorrect arg1 value' };
                }
            },
        };
        actionManager.registerAction(testActionWithNestedArgs);
        const actionName = 'testActionWithNestedArgs';
        const content = {
            command: 'test',
            content: JSON.stringify({ field1: 'value1' }),
            fileName: 'test.txt',
        };
        const result = await actionManager.applyAction(actionName, content);
        expect(result.exitCode).to.equal(0);
        expect(result.stdout).to.equal('');
        expect(result.stderr).to.equal('');
    });

	it('should return error when content is missing required args', async () => {
        const actionManager = ActionManager.getInstance();
        const testActionWithMissingArgs: Action = {
            ...testAction,
            name: 'testActionWithMissingArgs',
            args: [
                {
                    name: 'arg1',
                    description: 'arg1 description',
                    type: 'string',
                    from: 'content.field1',
                },
            ],
            handlerAction: async (args) => {
                return { exitCode: 0, stdout: '', stderr: '' };
            },
        };
        actionManager.registerAction(testActionWithMissingArgs);
        const actionName = 'testActionWithMissingArgs';
        const content = {
            command: 'test',
            content: JSON.stringify({}),
            fileName: 'test.txt',
        };
        const result = await actionManager.applyAction(actionName, content);
        expect(result.exitCode).to.equal(-1);
        expect(result.stdout).to.equal('');
        expect(result.stderr).to.equal('Action testActionWithMissingArgs arg arg1 from content.field1 is undefined');
    });

	it('should trigger handlerAction of CommandRunAction', async () => {
		class TestAction implements Action {
			name: string;
			description: string;
			type: string[];
			action: string;
			handler: string[];
			args: { name: string; description: string; type: string; as?: string | undefined; from: string; }[];
		
			constructor() {
				this.name = 'testAction2';
				this.description = 'Test action for unit testing';
				this.type = ['test'];
				this.action = 'test';
				this.handler = [];
				this.args = [];
			}
			async handlerAction(content: any): Promise<{ exitCode: number; stdout: string; stderr: string }> {
				return {
					exitCode: 0,
					stdout: 'Test action executed successfully',
					stderr: '',
				};
			}
		}

		const actionManager = ActionManager.getInstance();
		const testAction = new TestAction();
		actionManager.registerAction(testAction);
	
		const commandRunActionContent = {
			command: 'testAction2',
			args: {},
		};
	
		const content = {
			command: 'command_run',
			content: JSON.stringify(commandRunActionContent),
			fileName: 'test.txt',
		};
	
		const result = await actionManager.applyAction('command_run', content);
		expect(result.exitCode).to.equal(0);
		expect(result.stdout).to.equal('Test action executed successfully');
		expect(result.stderr).to.equal('');
	});
});