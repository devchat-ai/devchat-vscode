import { expect } from 'chai';
import 'mocha';
import fs from 'fs';
import path from 'path';
import { CustomActions } from '../../src/action/customAction';

describe('CustomActions', () => {
	const customActions = CustomActions.getInstance();

	it('should return an empty action list', () => {
		const actions = customActions.getActions();
		expect(actions).to.deep.equal([]);
	});

	it('should return a non-empty action instruction with actions', () => {
		// Add a sample action to the customActions instance
		customActions.getActions().push({
			name: 'sampleAction',
			description: 'A sample action for testing',
			type: ['test'],
			action: 'sample',
			handler: [],
			args: [],
			handlerAction: async (args: { [key: string]: string }) => {
				return { exitCode: 0, stdout: '', stderr: '' };
			},
		});

		const instruction = customActions.actionInstruction();
		expect(instruction).to.include('sampleAction: A sample action for testing');
	});

	it('should return action instruction with args', () => {
		// Add a sample action with args to the customActions instance
		customActions.getActions().push({
			name: 'sampleActionWithArgs',
			description: 'A sample action with args for testing',
			type: ['test'],
			action: 'sample',
			handler: [],
			args: [
				{
					"name": "arg1",
					"description": "Argument 1",
					"type": "string",
					"from": "content.fileName"
				},
				{
					"name": "arg2",
					"description": "Argument 2",
					"type": "number",
					"from": "content.content"
				}
			],
			handlerAction: async (args: { [key: string]: string }) => {
				return { exitCode: 0, stdout: '', stderr: '' };
			},
		});

		const instruction = customActions.actionInstruction();
		expect(instruction).to.include('sampleActionWithArgs: A sample action with args for testing');
		expect(instruction).to.include('Args:');
		expect(instruction).to.include('name: arg1  type: (string)  description: Argument 1');
		expect(instruction).to.include('name: arg2  type: (number)  description: Argument 2');
	});

	it('should parse actions from workflows directory', () => {
		// Create a temporary workflows directory with a sample action
		const workflowsDir = path.join(__dirname, 'temp_workflows');
		fs.mkdirSync(workflowsDir);
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension'));
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension', 'action'));
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension', 'action', 'sample_action'));
		const settingsPath = path.join(workflowsDir, 'sample_extension', 'action', 'sample_action', '_setting_.json');
		const sampleActionSettings = {
			name: 'sampleParsedAction',
			description: 'A sample parsed action for testing',
			type: ['test'],
			action: 'sample',
			handler: [],
			args: [],
		};
		fs.writeFileSync(settingsPath, JSON.stringify(sampleActionSettings));

		// Call parseActions with the temporary workflows directory
		customActions.parseActions(workflowsDir);

		// Check if the parsed action is in the actions list
		const actions = customActions.getActions();
		const parsedAction = actions.find(action => action.name === 'sampleParsedAction');
		expect(parsedAction).to.not.be.undefined;
		expect(parsedAction?.description).to.equal('A sample parsed action for testing');

		// Clean up the temporary workflows directory
		fs.unlinkSync(settingsPath);
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension', 'action', 'sample_action'));
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension', 'action'));
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension'));
		fs.rmdirSync(workflowsDir);
	});

	it('should parse handlerAction correctly from directory with echo command', async () => {
		// Create a temporary directory for the sample action
		const workflowsDir = path.join(__dirname, 'temp_workflows');
		fs.mkdirSync(workflowsDir);
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension'));
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension', 'action'));
		fs.mkdirSync(path.join(workflowsDir, 'sample_extension', 'action', 'sample_action'));
		const settingsPath = path.join(workflowsDir, 'sample_extension', 'action', 'sample_action', '_setting_.json');
		const sampleActionJson = {
			name: 'sampleAction',
			description: 'A sample action with a handlerAction method for testing',
			type: ['test'],
			action: 'sample',
			handler: ["echo", "${arg1}"],
			args: [
				{ name: 'arg1', type: 'string' },
				{ name: 'arg2', type: 'string' },
			],
		};
		fs.writeFileSync(settingsPath, JSON.stringify(sampleActionJson));


		// Call parseActions with the temporary directory
		customActions.parseActions(workflowsDir);
		const actions = customActions.getActions();

		// Clean up the temporary directory
		fs.unlinkSync(settingsPath);
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension', 'action', 'sample_action'));
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension', 'action'));
		fs.rmdirSync(path.join(workflowsDir, 'sample_extension'));
		fs.rmdirSync(workflowsDir);

		// Check if the returned actions array has the expected length
		expect(actions.length).equal(1);

		// Get the parsed action object
		const parsedAction = actions[0];

		// Call the handlerAction method with valid args
		const validResult = await parsedAction.handlerAction({ arg1: 'value1', arg2: 'value2' });

		// Check if the returned CommandResult is as expected
		expect(validResult).to.deep.equal({ exitCode: 0, stdout: 'value1\n', stderr: '' });

		// Call the handlerAction method with invalid args
		const invalidResult = await parsedAction.handlerAction({ arg1: 'wrongValue', arg2: 'value2' });

		// Check if the returned CommandResult is as expected
		expect(invalidResult).to.deep.equal({ exitCode: 0, stdout: 'wrongValue\n', stderr: '' });
	});
});