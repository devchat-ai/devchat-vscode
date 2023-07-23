import { expect } from 'chai';
import 'mocha';
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
});