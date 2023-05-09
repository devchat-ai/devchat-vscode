import * as vscode from 'vscode';

import { createChatDirectoryAndCopyInstructionsSync } from './init/chatConfig';
import {
  registerOpenChatPanelCommand,
  registerAddContextCommand,
  registerAskForCodeCommand,
  registerAskForFileCommand,
} from './contributes/commands';

import ExtensionContextHolder from './util/extensionContext';
import { logger } from './util/logger';


function activate(context: vscode.ExtensionContext) {
  ExtensionContextHolder.context = context;
  logger.init(context);

  // 创建 .chat 目录并复制 instructions
  createChatDirectoryAndCopyInstructionsSync(context.extensionUri);

  registerOpenChatPanelCommand(context);
  registerAddContextCommand(context);
  registerAskForCodeCommand(context);
  registerAskForFileCommand(context);
}
exports.activate = activate;
