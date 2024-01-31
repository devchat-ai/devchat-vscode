import * as vscode from "vscode";
import * as path from "path";

// TODO: merge with find-defs.ts

interface Reference {
    name: string;
    abspath: string;
    line: number; // 1-based
    character: number; // 1-based
}

/**
 * @param abspath: absolute path of the file
 * @param line: line number, 1-based
 * @param character: character number, 1-based
 *
 **/
async function findReferences(
    abspath: string,
    line: number,
    character: number
): Promise<Reference[]> {
    const uri = vscode.Uri.file(abspath);
    const position = new vscode.Position(line - 1, character - 1);

    // TODO: verify if the file & position is correct
    // const document = await vscode.workspace.openTextDocument(uri);

    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
        "vscode.executeReferenceProvider",
        uri,
        position
    );

    const references: Reference[] = [];
    if (locations) {
        for (const location of locations) {
            console.log(
                `* Reference found in file: ${location.uri.fsPath}, line: ${location.range.start.line}, character: ${location.range.start.character}`
            );
            // use `map` & `Promise.all` to improve performance if needed
            const doc = await vscode.workspace.openTextDocument(location.uri);

            references.push({
                name: doc.getText(location.range),
                abspath: location.uri.fsPath,
                line: location.range.start.line + 1,
                character: location.range.start.character + 1,
            });
        }
    } else {
        console.log("No reference found");
    }

    return references;
}

export { findReferences };
