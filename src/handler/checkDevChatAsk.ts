import * as vscode from 'vscode';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { getPackageVersion } from '../util/python_installer/pip_package_version';


export async function isDevChatInstalledImpl() {
	let pythonVirtualEnv: string | undefined =  vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv');
	
	if (pythonVirtualEnv) {
		// check whether pythonVirtualEnv is stisfy the requirement version
		const devchatAskVersion = getPackageVersion(pythonVirtualEnv, "devchat-ask");
		if (!devchatAskVersion || devchatAskVersion < "0.1.7") {
			pythonVirtualEnv = undefined;
		}
	}

	return pythonVirtualEnv ? true : false;
}

regInMessage({command: 'isDevChatInstalled'});
regOutMessage({command: 'isDevChatInstalled', result: true});
export async function isDevChatInstalled(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
	const installed = await isDevChatInstalledImpl();
	MessageHandler.sendMessage(panel, { command: 'isDevChatInstalled', result: installed });
}


