import { commitMessageCommand } from './commitMessageCommand';


describe('commitMessageCommand', () => {
  it('should return a commit message instruction when a workspace is available', async () => {
    const workspaceDir = '/path/to/workspace';
    const expectedInstruction = `[instruction|${workspaceDir}/.chat/instructions/commit_message/instCommitMessage.txt] Write a commit message`;

    const result = await commitMessageCommand.handler('');
    expect(result).toEqual(expectedInstruction);
  });

  it('should return a default commit message when no workspace is available', async () => {
    const expectedMessage = 'Write a commit message';

    // Update the mock to return undefined for workspaceFolders
    // vscode.workspace.workspaceFolders = undefined;

    const result = await commitMessageCommand.handler('');
    expect(result).toEqual(expectedMessage);
  });
});
