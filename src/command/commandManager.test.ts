import CommandManager, { Command } from './commandManager';

describe('CommandManager', () => {
  let commandManager: CommandManager;

  beforeEach(() => {
    commandManager = CommandManager.getInstance();
  });

  test('registerCommand and getCommandList', () => {
    const command: Command = {
      name: 'test',
      pattern: 'test {{prompt}}',
      description: 'Test command',
      handler: async (userInput: string) => `Test: ${userInput}`,
    };

    commandManager.registerCommand(command);
    const commandList = commandManager.getCommandList();

    expect(commandList).toContain(command);
  });

  test('processText', async () => {
    const command: Command = {
      name: 'test',
      pattern: 'test {{prompt}}',
      description: 'Test command',
      handler: async (userInput: string) => `Test: ${userInput}`,
    };

    commandManager.registerCommand(command);
    const inputText = 'This is a /test {{sample}} text';
    const expectedOutput = 'This is a Test: test {{sample}} text';

    const processedText = await commandManager.processText(inputText);

    expect(processedText).toBe(expectedOutput);
  });
});
