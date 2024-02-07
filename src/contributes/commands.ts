import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import { ExtensionContextHolder } from '../util/extensionContext';
import { FilePairManager } from '../util/diffFilePairs';
import { ApiKeyManager } from '../util/apiKey';
import { UiUtilWrapper } from '../util/uiUtil';
import { isValidApiKey } from '../handler/historyMessagesBase';

import { logger } from '../util/logger';

import { sendCommandListByDevChatRun, updateChatModels } from '../handler/workflowCommandHandler';
import DevChat from "../toolwrapper/devchat";
import { createEnvByConda, createEnvByMamba } from '../util/python_installer/app_install';
import { installRequirements } from '../util/python_installer/package_install';
import { chatWithDevChat } from '../handler/chatHandler';
import { focusDevChatInput } from '../handler/focusHandler';

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const copyFile = util.promisify(fs.copyFile);

async function copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('devchat.openChatPanel', async () => {
		await vscode.commands.executeCommand('devchat-view.focus');
		await focusDevChatInput(ExtensionContextHolder.provider?.view()!);
	});
	context.subscriptions.push(disposable);
}

async function ensureChatPanel(context: vscode.ExtensionContext): Promise<boolean> {
	await vscode.commands.executeCommand('devchat-view.focus');
	return true;
}

function registerAddContextCommand(context: vscode.ExtensionContext) {
	const callback = async (uri: { fsPath: any; }) => {
		if (!await ensureChatPanel(context)) {
			return;
		}

		await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, uri.fsPath);
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addContext', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addConext_chinese', callback));
}

function registerAskForCodeCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			const selectedText = editor.document.getText(editor.selection);
			await sendCodeSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName, selectedText, editor.selection.start.line);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode_chinese', callback));
}

function registerAskForFileCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile_chinese', callback));
}

function regAccessKeyCommand(context: vscode.ExtensionContext, provider: string) {
	context.subscriptions.push(
		vscode.commands.registerCommand(`DevChat.AccessKey.${provider}`, async () => {
			vscode.commands.executeCommand("devchat-view.focus");
			const passwordInput: string | undefined = await vscode.window.showInputBox({
				password: true,
				title: `Set ${provider} Key`,
				placeHolder: `Input your ${provider} key. (Leave blank to clear the stored key.)`
			}) ?? undefined;
			if (passwordInput === undefined) {
				return;
			}
			if (provider === "DevChat" && passwordInput.trim() !== "") {
				if (!passwordInput.trim().startsWith("DC.")) {
					UiUtilWrapper.showErrorMessage("Your key is invalid! DevChat Access Key is: DC.xxxxx");
					return;
				}
			}

			if (passwordInput.trim() !== "" && !isValidApiKey(passwordInput)) {
				UiUtilWrapper.showErrorMessage("Your key is invalid!");
				return ;
			}
			await ApiKeyManager.writeApiKeySecret(passwordInput, provider);

			// update default model
			const accessKey = await ApiKeyManager.getApiKey();
			if (!accessKey) {
				const modelList = await ApiKeyManager.getValidModels();
				if (modelList && modelList.length > 0) {
					// update default llm model
					await UiUtilWrapper.updateConfiguration('devchat', 'defaultModel', modelList[0]);
				}
			}

			// reload webview
			ExtensionContextHolder.provider?.reloadWebview();
		})
	);
}

export function registerAccessKeySettingCommand(context: vscode.ExtensionContext) {
	regAccessKeyCommand(context,  "OpenAI");
	regAccessKeyCommand(context,  "Cohere");
	regAccessKeyCommand(context,  "Anthropic");
	regAccessKeyCommand(context,  "Replicate");
	regAccessKeyCommand(context,  "HuggingFace");
	regAccessKeyCommand(context,  "TogetherAI");
	regAccessKeyCommand(context,  "OpenRouter");
	regAccessKeyCommand(context,  "VertexAI");
	regAccessKeyCommand(context,  "AI21");
	regAccessKeyCommand(context,  "BaseTen");
	regAccessKeyCommand(context,  "Azure");
	regAccessKeyCommand(context,  "SageMaker");
	regAccessKeyCommand(context,  "Bedrock");
	regAccessKeyCommand(context,  "DevChat");
}

export function registerStatusBarItemClickCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devcaht.onStatusBarClick', async () => {
			await vscode.commands.executeCommand('devchat-view.focus');
		})
	);
}

export function regPythonPathCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.PythonPath', async () => {
			const pythonPath = await vscode.window.showInputBox({
				title: "Set Python Path",
				placeHolder: "Set Python Path"
			}) ?? '';

			if (pythonPath) {
				vscode.workspace.getConfiguration("DevChat").update("PythonForChat", pythonPath, vscode.ConfigurationTarget.Global);
			}
		})
	);
}

export function regApplyDiffResultCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.applyDiffResult', async () => {
			const activeEditor = vscode.window.activeTextEditor;
			const fileName = activeEditor!.document.fileName;

			const [leftUri, rightUri] = FilePairManager.getInstance().findPair(fileName) || [undefined, undefined];
			if (leftUri && rightUri) {
				// 获取对比的两个文件
				const leftDoc = await vscode.workspace.openTextDocument(leftUri);
				const rightDoc = await vscode.workspace.openTextDocument(rightUri);

				// close rightDoc
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				// 将右边文档的内容替换到左边文档
				const leftEditor = await vscode.window.showTextDocument(leftDoc);
				await leftEditor.edit(editBuilder => {
					const fullRange = new vscode.Range(0, 0, leftDoc.lineCount, 0);
					editBuilder.replace(fullRange, rightDoc.getText());
				});

				// 保存左边文档
				await leftDoc.save();
			} else {
				vscode.window.showErrorMessage('No file to apply diff result.');
			}
		})
	);
}


export function registerInstallCommandsCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.InstallCommands', async () => {
        const homePath = process.env.HOME || process.env.USERPROFILE || '';
        const sysDirPath = path.join(homePath, '.chat', 'workflows', 'sys');
        const pluginDirPath = path.join(UiUtilWrapper.extensionPath(), 'workflowsCommands'); // Adjust this path as needed

		const devchat = new DevChat();

		if (!fs.existsSync(sysDirPath)) {
			await copyDirectory(pluginDirPath, sysDirPath);
        }

        // Check if ~/.chat/workflows/sys directory exists
        if (!fs.existsSync(sysDirPath)) {
            // Directory does not exist, wait for updateSysCommand to finish
            await devchat.updateSysCommand();
            sendCommandListByDevChatRun();
        } else {
            // Directory exists, execute sendCommandListByDevChatRun immediately
            await sendCommandListByDevChatRun();

            // Then asynchronously execute updateSysCommand
			await devchat.updateSysCommand();
			await sendCommandListByDevChatRun();
        }
    });

    context.subscriptions.push(disposable);
}

export function registerUpdateChatModelsCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.UpdataChatModels', async () => {
        updateChatModels();
    });

    context.subscriptions.push(disposable);
}

export function registerInstallCommandsPython(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('DevChat.InstallCommandPython', async () => {
		// steps of install command python
		// 1. install python >= 3.11
		// 2. check requirements.txt in ~/.chat dir
		// 3. install requirements.txt

		// 1. install python >= 3.11
		logger.channel()?.info(`create env for python ...`);
		logger.channel()?.info(`try to create env by mamba ...`);
		let pythonCommand = await createEnvByMamba("devchat-commands", "", "3.11.4");

		if (!pythonCommand || pythonCommand === "") {
			logger.channel()?.info(`create env by mamba failed, try to create env by conda ...`);
			pythonCommand = await createEnvByConda("devchat-commands", "", "3.11.4");
		}

		if (!pythonCommand || pythonCommand === "") {
			logger.channel()?.error(`create virtual python env failed, you need create it by yourself with command: "conda create -n devchat-commands python=3.11.4"`);
			logger.channel()?.show();

			return ;
		}

		// 2. check requirements.txt in ~/.chat dir
		// ~/.chat/requirements.txt
		const usrRequirementsFile = path.join(os.homedir(), '.chat', 'workflows', 'usr', 'requirements.txt');
		const orgRequirementsFile = path.join(os.homedir(), '.chat', 'workflows', 'org', 'requirements.txt');
		const sysRequirementsFile = path.join(os.homedir(), '.chat', 'workflows', 'sys', 'requirements.txt');
		let requirementsFile = sysRequirementsFile;
		if (fs.existsSync(orgRequirementsFile)) {
			requirementsFile = orgRequirementsFile;
		}
		if (fs.existsSync(usrRequirementsFile)) {
			requirementsFile = usrRequirementsFile;
		}

		if (!fs.existsSync(requirementsFile)) {
			// logger.channel()?.warn(`requirements.txt not found in ~/.chat/workflows dir.`);
			// logger.channel()?.show();
			// vscode.window.showErrorMessage(`Error: see OUTPUT for more detail!`);
			return ;
		}

		// 3. install requirements.txt
		// run command: pip install -r {requirementsFile}
		let isInstalled = false;
		// try 3 times
		for (let i = 0; i < 4; i++) {
			let otherSource: string | undefined = undefined;
			if (i>1) {
				otherSource = 'https://pypi.tuna.tsinghua.edu.cn/simple/';
			}
			isInstalled = await installRequirements(pythonCommand, requirementsFile, otherSource);
			if (isInstalled) {
				break;
			}
			logger.channel()?.info(`Install packages failed, try again: ${i + 1}`);
		}
		if (!isInstalled) {
			logger.channel()?.error(`Install packages failed, you can install it with command: "${pythonCommand} -m pip install -r ~/.chat/requirements.txt"`);
			logger.channel()?.show();
			vscode.window.showErrorMessage(`Error: see OUTPUT for more detail!`);
			return '';
		}
		
		UiUtilWrapper.updateConfiguration("DevChat", "PythonForCommands", pythonCommand.trim());
		// vscode.window.showInformationMessage(`All slash Commands are ready to use! Please input / to try workflow commands!`);
	});

	context.subscriptions.push(disposable);
}

export function registerDevChatChatCommand(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('DevChat.Chat', async (message: string) => {
		ensureChatPanel(context);
		if (!ExtensionContextHolder.provider?.view()) {
			// wait 2 seconds
			await new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve(true);
				}, 2000);
			});
		}
		chatWithDevChat(ExtensionContextHolder.provider?.view()!, message);
	});

	context.subscriptions.push(disposable);
}

export function registerHandleUri(context: vscode.ExtensionContext){
	context.subscriptions.push(vscode.window.registerUriHandler({
		async handleUri(uri) {
		  // 解析 URI 并执行相应的操作
		  if (uri.path.includes('accesskey')) {
			const accessKey = uri.path.split('/')[2];
			const modelConfig: any = UiUtilWrapper.getConfiguration("devchat", 'Provider.devchat');
			const providerConfigNew:any = {}
			if (Object.keys(modelConfig).length !== 0){
				for (const key of Object.keys(modelConfig || {})) {
					const property = modelConfig![key];
					providerConfigNew[key] = property;
				}
			}
			providerConfigNew.access_key = accessKey;
			vscode.workspace.getConfiguration("devchat").update("Provider.devchat", providerConfigNew, vscode.ConfigurationTarget.Global);
			ensureChatPanel(context);
			await new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve(true);
				}, 1000);
			});
			ExtensionContextHolder.provider?.reloadWebview();
		  }
		}
	}));
}

export {
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
};
