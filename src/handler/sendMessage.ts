
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import DevChat from '../toolwrapper/devchat';
import CommandManager from '../command/commandManager';


// Add this function to messageHandler.ts
function parseMessage(message: string): { context: string[]; instruction: string[]; reference: string[]; text: string } {
	const contextRegex = /\[context\|(.*?)\]/g;
	const instructionRegex = /\[instruction\|(.*?)\]/g;
	const referenceRegex = /\[reference\|(.*?)\]/g;

	const contextPaths = [];
	const instructionPaths = [];
	const referencePaths = [];

	let match;

	// 提取 context
	while ((match = contextRegex.exec(message)) !== null) {
		contextPaths.push(match[1]);
	}

	// 提取 instruction
	while ((match = instructionRegex.exec(message)) !== null) {
		instructionPaths.push(match[1]);
	}

	// 提取 reference
	while ((match = referenceRegex.exec(message)) !== null) {
		referencePaths.push(match[1]);
	}

	// 移除标签，保留纯文本
	const text = message
		.replace(contextRegex, '')
		.replace(instructionRegex, '')
		.replace(referenceRegex, '')
		.trim();

	return { context: contextPaths, instruction: instructionPaths, reference: referencePaths, text };
}

function getInstructionFiles(): string[] {
	const instructionFiles: string[] = [];
	const workspaceDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if (workspaceDir) {
		const chatInstructionsPath = path.join(workspaceDir, '.chat', 'instructions', 'default');
		try {
			// 读取 chatInstructionsPath 目录下的所有文件和目录
			const files = fs.readdirSync(chatInstructionsPath);
			// 过滤出文件，忽略目录
			for (const file of files) {
				const filePath = path.join(chatInstructionsPath, file);
				const fileStats = fs.statSync(filePath);
				if (fileStats.isFile()) {
					instructionFiles.push(filePath);
				}
			}
		} catch (error) {
			console.error('Error reading instruction files:', error);
		}
	}
	return instructionFiles;
}


let lastPromptHash: string | undefined;

export async function sendMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const devChat = new DevChat();

	const newText2 = await CommandManager.getInstance().processText(message.text);
	panel.webview.postMessage({ command: 'convertCommand', result: newText2 });

	const parsedMessage = parseMessage(newText2);
	const chatOptions: any = lastPromptHash ? { parent: lastPromptHash } : {};

	if (parsedMessage.context.length > 0) {
		chatOptions.context = parsedMessage.context;
	}

	chatOptions.header = getInstructionFiles();
	if (parsedMessage.instruction.length > 0) {
		chatOptions.header = parsedMessage.instruction;
	}

	if (parsedMessage.reference.length > 0) {
		chatOptions.reference = parsedMessage.reference;
	}

	let partialData = "";
	const onData = (partialResponse: string) => {
		partialData += partialResponse;
		panel.webview.postMessage({ command: 'receiveMessagePartial', text: partialData });
	};

	const chatResponse = await devChat.chat(parsedMessage.text, chatOptions, onData);
	if (chatResponse && typeof chatResponse === 'object' && !Array.isArray(chatResponse) && !(chatResponse instanceof String)) {
		// 检查 "prompt-hash" 是否在 chatResponse 中
		if ('prompt-hash' in chatResponse) {
			// 检查 chatResponse['prompt-hash'] 是否不为空
			if (chatResponse['prompt-hash']) {
				// 如果 "prompt-hash" 在 chatResponse 中且不为空，则更新 lastPromptHash 的值
				lastPromptHash = chatResponse['prompt-hash'];
			}
		}
	}
	const response = chatResponse.response;
	panel.webview.postMessage({ command: 'receiveMessage', text: response });
	return;
}



