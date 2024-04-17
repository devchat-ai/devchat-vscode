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
            const code = await collapseFileExculdeSelectRange(document.uri.fsPath, document.getText(), range.start.line, range.end.line);

            const surroundingRange = new vscode.Range(
                Math.max(0, range.start.line - 3),
                0,
                Math.min(document.lineCount, range.end.line + 3),
                0,
            );

            quickFix.command = {
                command: "DevChat.quickFix",
                title: "DevChat Quick Fix",
                arguments: [
                    diagnostic.message,
                    code,
                    document.getText(surroundingRange)
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

