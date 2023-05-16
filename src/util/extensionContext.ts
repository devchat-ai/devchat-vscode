import * as vscode from 'vscode';
import { DevChatViewProvider } from '../panel/devchatView';

class ExtensionContextHolder {
  private static _context: vscode.ExtensionContext | undefined;
  private static _provider: DevChatViewProvider | undefined;

  static set context(context: vscode.ExtensionContext | undefined) {
    this._context = context;
  }

  static get context(): vscode.ExtensionContext | undefined {
    return this._context;
  }

  static set provider(provider: DevChatViewProvider | undefined) {
	this._provider = provider;
  }

  static get provider(): DevChatViewProvider | undefined {
	return this._provider;
  }
}

export default ExtensionContextHolder;
