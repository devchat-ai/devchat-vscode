import * as vscode from 'vscode';
import { activate } from './extension';
import { createChatDirectoryAndCopyInstructionsSync } from './initmodule/chatConfig';
import {
  registerOpenChatPanelCommand,
  registerAddContextCommand,
  registerAskForCodeCommand,
  registerAskForFileCommand,
} from './contributes/commands';
import ExtensionContextHolder from './util/extensionContext';

jest.mock('./initmodule/chatConfig', () => ({
  createChatDirectoryAndCopyInstructionsSync: jest.fn(),
}));

jest.mock('./contributes/commands', () => ({
  registerOpenChatPanelCommand: jest.fn(),
  registerAddContextCommand: jest.fn(),
  registerAskForCodeCommand: jest.fn(),
  registerAskForFileCommand: jest.fn(),
}));

describe('activate', () => {
  it('should set the ExtensionContextHolder context and call the necessary functions', () => {
    const context = {} as vscode.ExtensionContext;

    activate(context);

    expect(ExtensionContextHolder.context).toBe(context);
    expect(createChatDirectoryAndCopyInstructionsSync).toHaveBeenCalledWith(context.extensionUri);
    expect(registerOpenChatPanelCommand).toHaveBeenCalledWith(context);
    expect(registerAddContextCommand).toHaveBeenCalledWith(context);
    expect(registerAskForCodeCommand).toHaveBeenCalledWith(context);
    expect(registerAskForFileCommand).toHaveBeenCalledWith(context);
  });
});
