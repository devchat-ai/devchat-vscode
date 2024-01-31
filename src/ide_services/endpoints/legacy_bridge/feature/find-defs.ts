import * as vscode from "vscode";

interface Definition {
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
async function findDefinitions(
    abspath: string,
    line: number,
    character: number
): Promise<Definition[]> {
    const uri = vscode.Uri.file(abspath);
    const position = new vscode.Position(line - 1, character - 1);

    // TODO: verify if the file & position is correct
    // const document = await vscode.workspace.openTextDocument(uri);

    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
        "vscode.executeDefinitionProvider",
        uri,
        position
    );

    const definitions: Definition[] = [];
    if (locations) {
        for (const location of locations) {
            console.log(
                `* Definition found in file: ${location.uri.fsPath}, line: ${location.range.start.line}, character: ${location.range.start.character}`
            );
            // use `map` & `Promise.all` to improve performance if needed
            const doc = await vscode.workspace.openTextDocument(location.uri);

            definitions.push({
                name: doc.getText(location.range),
                abspath: location.uri.fsPath,
                line: location.range.start.line + 1,
                character: location.range.start.character + 1,
            });
        }
    } else {
        console.log("No definition found");
    }

    console.log(`* Found ${definitions.length} definitions`);
    console.log(definitions);
    return definitions;
}

function findText(
    document: vscode.TextDocument,
    text: string
): vscode.Position[] {
    const positions: vscode.Position[] = [];
    if (!text) {
        return positions;
    }

    const content = document.getText();

    let index = content.indexOf(text);
    while (index >= 0) {
        const position = document.positionAt(index);
        positions.push(position);

        // Find the next occurrence
        index = content.indexOf(text, index + 1);
    }

    return positions;
}

async function findDefinitionsOfToken(
    abspath: string,
    token: string
): Promise<Definition[]> {
    const uri = vscode.Uri.file(abspath);
    const document = await vscode.workspace.openTextDocument(uri);
    const positions = findText(document, token);
    console.log(`- Found ${positions.length} <${token}>`);

    // TODO: verify if the file & position is correct
    // const document = await vscode.workspace.openTextDocument(uri);
    const definitions: Definition[] = [];
    const visited = new Set<string>();

    for (const position of positions) {
        const locations = await vscode.commands.executeCommand<
            vscode.Location[]
        >("vscode.executeDefinitionProvider", uri, position);

        if (!locations) {
            console.log("No definition found");
            continue;
        }

        for (const location of locations) {
            const locationKey = `${location.uri.fsPath}:${location.range.start.line}:${location.range.start.character}`;
            if (visited.has(locationKey)) {
                continue;
            }
            visited.add(locationKey);

            console.log(
                `- <${token}> Definition found in file: ${location.uri.fsPath}, line: ${location.range.start.line}, character: ${location.range.start.character}`
            );
            // use `map` & `Promise.all` to improve performance if needed
            const doc = await vscode.workspace.openTextDocument(location.uri);

            definitions.push({
                name: doc.getText(location.range),
                abspath: location.uri.fsPath,
                line: location.range.start.line + 1,
                character: location.range.start.character + 1,
            });
        }
    }
    console.log(`* Found ${definitions.length} definitions`);
    console.log(definitions);
    return definitions;
}

export { findDefinitions, findDefinitionsOfToken };
