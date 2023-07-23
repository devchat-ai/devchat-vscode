import { expect } from 'chai';
import { describe, it } from 'mocha';
import CommandManager, { Command } from '../../src/command/commandManager';
import CustomCommands, { Command as CCommand} from '../../src/command/customCommand';

describe('CommandManager', () => {
  let commandManager: CommandManager;

  beforeEach(() => {
    commandManager = CommandManager.getInstance();
  });

  afterEach(() => {
    // Reset the command list after each test
    commandManager['commands'] = [];
  });

  it('should register a command', () => {
    const command: Command = {
      name: 'test',
      pattern: 'test',
      description: 'Test command',
	  args: 0,
      handler: async (commandName: string, userInput: string) => {
        return 'Test result';
      },
    };

    commandManager.registerCommand(command);
    expect(commandManager['commands']).to.include(command);
  });

  it('should return the command list', () => {
    const command: Command = {
      name: 'test',
      pattern: 'test',
      description: 'Test command',
	  args: 0,
      handler: async (commandName: string, userInput: string) => {
        return 'Test result';
      },
    };

    commandManager.registerCommand(command);
    expect(commandManager.getCommandList()).to.include(command);
  });

  it('should process text with a command', async () => {
    const command: Command = {
      name: 'test',
      pattern: 'test',
      description: 'Test command',
	  args: 0,
      handler: async (commandName: string, userInput: string) => {
        return 'Test result';
      },
    };

    commandManager.registerCommand(command);
    const result = await commandManager.processText('/test');
    expect(result).to.equal('Test result');
  });

  it('should process text with a custom command', async () => {
    const customCommand: CCommand = {
      name: 'customTest',
      pattern: 'customTest',
      description: 'Custom test command',
	  message: 'Custom test result',
	  args: 0,
      show: true,
	  default: false,
	  instructions: []
    };

    CustomCommands.getInstance().regCommand(customCommand);
    const result = await commandManager.processText('/customTest');
    expect(result).to.equal('  Custom test result');
  });
});