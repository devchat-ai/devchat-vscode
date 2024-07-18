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

        const fixUsingDevChat = new vscode.CodeAction(
            "Fix using DevChat",
            vscode.CodeActionKind.QuickFix,
        );
        fixUsingDevChat.isPreferred = true;

        return new Promise(async (resolve) => {
            quickFix.command = {
                command: "DevChat.quickFixAskDevChat",
                title: "Ask DevChat",
                arguments: [
                    document,
                    range,
                    diagnostic,
                ],
            };

            fixUsingDevChat.command = {
                command: "DevChat.quickFixUsingDevChat",
                title: "Fix using DevChat",
                arguments: [
                    document,
                    range,
                    diagnostic,
                ],
            };

            resolve([quickFix, fixUsingDevChat]);
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