import CommandManager from './commandManager';
import { exampleCommand1 } from './exampleCommand1';
import { exampleCommand2 } from './exampleCommand2';

const commandManager = CommandManager.getInstance();

// 注册命令
commandManager.registerCommand(exampleCommand1);
commandManager.registerCommand(exampleCommand2);
