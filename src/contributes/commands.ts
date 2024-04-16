import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";
import { sendFileSelectMessage, sendCodeSelectMessage } from "./util";
import { ExtensionContextHolder } from "../util/extensionContext";
import { FilePairManager } from "../util/diffFilePairs";
import { ApiKeyManager } from "../util/apiKey";
import { UiUtilWrapper } from "../util/uiUtil";
import { isValidApiKey } from "../handler/historyMessagesBase";

import { logger } from "../util/logger";

import { sendCommandListByDevChatRun } from '../handler/workflowCommandHandler';
import DevChat from "../toolwrapper/devchat";
import { createEnvByConda, createEnvByMamba } from '../util/python_installer/app_install';
import { installRequirements } from '../util/python_installer/package_install';
import { chatWithDevChat } from '../handler/chatHandler';
import { focusDevChatInput } from '../handler/focusHandler';
import { DevChatConfig } from '../util/config';

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

export function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "devchat.openChatPanel",
    async () => {
      await vscode.commands.executeCommand("devchat-view.focus");
      await focusDevChatInput(ExtensionContextHolder.provider?.view()!);
    }
  );
  context.subscriptions.push(disposable);
}

async function ensureChatPanel(
  context: vscode.ExtensionContext
): Promise<boolean> {
  await vscode.commands.executeCommand("devchat-view.focus");
  return true;
}

export function registerAddContextCommand(context: vscode.ExtensionContext) {
  const callback = async (uri: { fsPath: any }) => {
    if (!(await ensureChatPanel(context))) {
      return;
    }

    await sendFileSelectMessage(
      ExtensionContextHolder.provider?.view()!,
      uri.fsPath
    );
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.addContext", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.addConext_chinese", callback)
  );
}

export function registerAskForCodeCommand(context: vscode.ExtensionContext) {
  const callback = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!(await ensureChatPanel(context))) {
        return;
      }

      const selectedText = editor.document.getText(editor.selection);
      await sendCodeSelectMessage(
        ExtensionContextHolder.provider?.view()!,
        editor.document.fileName,
        selectedText,
        editor.selection.start.line
      );
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.askForCode", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.askForCode_chinese", callback)
  );
}

export function registerAskForFileCommand(context: vscode.ExtensionContext) {
  const callback = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!(await ensureChatPanel(context))) {
        return;
      }

      await sendFileSelectMessage(
        ExtensionContextHolder.provider?.view()!,
        editor.document.fileName
      );
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.askForFile", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.askForFile_chinese", callback)
  );
}


export function registerStatusBarItemClickCommand(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("devcaht.onStatusBarClick", async () => {
      await vscode.commands.executeCommand("devchat-view.focus");
    })
  );
}

export function regPythonPathCommand(context: vscode.ExtensionContext) {
  	context.subscriptions.push(
		vscode.commands.registerCommand("devchat.PythonPath", async () => {
			const pythonPath = (await vscode.window.showInputBox({
														title: "Set Python Path",
														placeHolder: "Set Python Path",
								})) ?? "";

			if (pythonPath) {
				DevChatConfig.getInstance().set("python_for_chat", pythonPath);
			}
		})
	);
}

export function regApplyDiffResultCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.applyDiffResult", async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const fileName = activeEditor!.document.fileName;

      const [leftUri, rightUri] = FilePairManager.getInstance().findPair(
        fileName
      ) || [undefined, undefined];
      if (leftUri && rightUri) {
        // 获取对比的两个文件
        const leftDoc = await vscode.workspace.openTextDocument(leftUri);
        const rightDoc = await vscode.workspace.openTextDocument(rightUri);

        // close rightDoc
        await vscode.commands.executeCommand(
          "workbench.action.closeActiveEditor"
        );
        // 将右边文档的内容替换到左边文档
        const leftEditor = await vscode.window.showTextDocument(leftDoc);
        await leftEditor.edit((editBuilder) => {
          const fullRange = new vscode.Range(0, 0, leftDoc.lineCount, 0);
          editBuilder.replace(fullRange, rightDoc.getText());
        });

        // 保存左边文档
        await leftDoc.save();
      } else {
        vscode.window.showErrorMessage("No file to apply diff result.");
      }
    })
  );
}

export function registerInstallCommandsCommand(
  context: vscode.ExtensionContext
) {
  let disposable = vscode.commands.registerCommand(
    "DevChat.InstallCommands",
    async () => {
      const homePath = process.env.HOME || process.env.USERPROFILE || "";
      const sysDirPath = path.join(homePath, ".chat", "workflows", "sys");
      const pluginDirPath = path.join(
        UiUtilWrapper.extensionPath(),
        "workflowsCommands"
      ); // Adjust this path as needed

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
    }
  );

  context.subscriptions.push(disposable);
}

export function registerTryWF(
  context: vscode.ExtensionContext
) {
  let disposable = vscode.commands.registerCommand(
    "DevChat.TryWF",
    async () => {

      const devchat = new DevChat();

      await devchat.tryWF();
    }
  );

  context.subscriptions.push(disposable);
}

export function registerDevChatChatCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "DevChat.Chat",
    async (message: string) => {
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
    }
  );

  context.subscriptions.push(disposable);
}

export function registerCodeLensRangeCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "CodeLens.Range",
    async (message: string, pos: { start: number; end: number }) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const range = new vscode.Range(
          new vscode.Position(pos.start, 0),
          new vscode.Position(pos.end + 1, 0)
        );
        editor.selection = new vscode.Selection(range.start, range.end);
      }
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
    }
  );

  context.subscriptions.push(disposable);
}

export function registerHandleUri(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri) {
        // 解析 URI 并执行相应的操作
        if (uri.path.includes("accesskey")) {
          const accessKey = uri.path.split("/")[2];
		  DevChatConfig.getInstance().set("provides.devchat.api_key", accessKey);
          ensureChatPanel(context);
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 1000);
          });
          ExtensionContextHolder.provider?.reloadWebview();
        }
      },
    })
  );
}

export function registerExplainCommand(context: vscode.ExtensionContext) {
  const callback = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!(await ensureChatPanel(context))) {
        return;
      }

      chatWithDevChat(ExtensionContextHolder.provider?.view()!, "/explain");
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.explain", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.explain_chinese", callback)
  );
}

export function registerCommentCommand(context: vscode.ExtensionContext) {
  const callback = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!(await ensureChatPanel(context))) {
        return;
      }

      chatWithDevChat(ExtensionContextHolder.provider?.view()!, "/comments");
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.comments", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.comments_chinese", callback)
  );
}

export function registerFixCommand(context: vscode.ExtensionContext) {
  const callback = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (!(await ensureChatPanel(context))) {
        return;
      }

      chatWithDevChat(ExtensionContextHolder.provider?.view()!, "/fix");
    }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.fix", callback)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("devchat.fix_chinese", callback)
  );
}

export function registerQuickFixCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
      "DevChat.quickFix",
      async (diagnosticMessage: string, code: string, surroundingCode: string) => {
          ensureChatPanel(context);
          if (!ExtensionContextHolder.provider?.view()) {
              await waitForPanelActivation();
          }

          const language = DevChatConfig.getInstance().get('language');
          const prompt = generatePrompt(code, surroundingCode, diagnosticMessage, language);
          chatWithDevChat(ExtensionContextHolder.provider?.view()!, prompt);
      }
  );

  context.subscriptions.push(disposable);
}

async function waitForPanelActivation() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, 2000);
    });
}

function generatePrompt(code: string, surroundingCode: string, diagnosticMessage: string, language: string) {
    return `current edit file is:\n\`\`\`\n${code}\n\`\`\`\n\nThere is an error in the above code:\n\`\`\`\n${surroundingCode}\n\`\`\`\n\nHow do I fix this problem in the above code?: ${diagnosticMessage}, please output steps to fix it. ${language === "zh" ? "结果输出请使用中文。" : ""} `;
}