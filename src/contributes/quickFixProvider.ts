import * as vscode from "vscode";
import { collapseFileExculdeSelectRange } from "./codecomplete/ast/collapseBlock";

class DevChatQuickFixProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        if (context.diagnostics.length === 0) {
            return [];
        }

        const diagnostic = context.diagnostics[0];
        const quickFix = new vscode.CodeAction(
            "Ask DevChat",
            vscode.CodeActionKind.QuickFix,
        );
        quickFix.isPreferred = false;

        return new Promise(async (resolve) => {
            quickFix.command = {
                command: "DevChat.quickFix",
                title: "DevChat Quick Fix",
                arguments: [
                    document,
                    range,
                    diagnostic,
                ],
            };

            resolve([quickFix]);
        });
    }
}

export default function registerQuickFixProvider() {
    vscode.languages.registerCodeActionsProvider(
        { language: "*" },
        new DevChatQuickFixProvider(),
        {
            providedCodeActionKinds: DevChatQuickFixProvider.providedCodeActionKinds,
        },
    );
}

