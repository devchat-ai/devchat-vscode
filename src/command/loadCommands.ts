import CommandManager from './commandManager';
import { commitMessageCommand } from './commitMessageCommand';

const commandManager = CommandManager.getInstance();

// 注册命令
commandManager.registerCommand(commitMessageCommand);