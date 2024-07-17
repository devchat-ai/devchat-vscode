import * as vscode from "vscode";
import { MessageHandler } from "./messageHandler";
import { regInMessage, regOutMessage } from "../util/reg_messages";
import { DevChatClient } from "../toolwrapper/devchatClient";
import { logger } from "../util/logger";

let existPannel: vscode.WebviewPanel | vscode.WebviewView | undefined =
    undefined;

regInMessage({ command: "regCommandList" });
regOutMessage({
    command: "regCommandList",
    result: [{ name: "", pattern: "", description: "" }],
});
export async function handleRegCommandList(
    message: any,
    panel: vscode.WebviewPanel | vscode.WebviewView
): Promise<void> {
    existPannel = panel;
    if (process.env.DC_LOCALSERVICE_PORT) {
        await getWorkflowCommandList(message, existPannel!);
    }
}

export async function getWorkflowCommandList(
    message: any,
    panel: vscode.WebviewPanel | vscode.WebviewView
): Promise<void> {
    const dcClient = new DevChatClient();

    // All workflows registered in DevChat
    const workflows = await dcClient.getWorkflowList();

    // Get recommends from config
    const workflowsConfig = await dcClient.getWorkflowConfig();
    const recommends = workflowsConfig.recommend?.workflows || [];

    // Filter active workflows and add recommend info
    const commandList = workflows
        .filter((workflow) => workflow.active)
        .map((workflow: any) => ({
            ...workflow,
            recommend: recommends.indexOf(workflow.name),
        }));

    if (commandList.length > 0) {
        MessageHandler.sendMessage(panel, {
            command: "regCommandList",
            result: commandList,
        });
    }

    return;
}

export async function sendCommandListByDevChatRun() {
    if (existPannel) {
        await getWorkflowCommandList({}, existPannel!);
    }
}
