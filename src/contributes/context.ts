import * as vscode from 'vscode';

export function regLanguageContext() {
	const currentLocale = vscode.env.language;
	if (currentLocale === 'zh-cn' || currentLocale === 'zh-tw') {
		vscode.commands.executeCommand('setContext', 'isChineseLocale', true);
	} else {
		vscode.commands.executeCommand('setContext', 'isChineseLocale', false);
	}
}