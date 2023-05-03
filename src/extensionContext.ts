import * as vscode from 'vscode';

class ExtensionContextHolder {
  private static _context: vscode.ExtensionContext | undefined;

  static set context(context: vscode.ExtensionContext | undefined) {
    this._context = context;
  }

  static get context(): vscode.ExtensionContext | undefined {
    return this._context;
  }
}

export default ExtensionContextHolder;
