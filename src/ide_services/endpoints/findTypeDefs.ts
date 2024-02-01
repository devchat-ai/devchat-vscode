import * as vscode from "vscode";

import { IDEService } from "../types";
import { assert } from "console";

/**
 * Find type definition locations for a symbol
 * 
 * @param abspath: absolute path of the file
 * @param line: line number of the symbol, 0-based
 * @param character: character number, 0-based
 */
export async function findTypeDefinitionLocations(
    abspath: string,
    line: string,
    character: string
): Promise<IDEService.Location[]> {
    const ln = Number(line);
    const col = Number(character);
    assert(!isNaN(ln) && !isNaN(col), "line and character must be numbers");

    const position = new vscode.Position(ln, col);
    const uri = vscode.Uri.file(abspath);

    const defs = await vscode.commands.executeCommand<
        vscode.Location[] | vscode.LocationLink[]
    >("vscode.executeTypeDefinitionProvider", uri, position);

    const locations: IDEService.Location[] = [];
    defs.forEach((def) => {
        locations.push(toLocation(def));
    });

    return locations;
}

/**
 *
 * @param location
 * @returns
 */
function toLocation(
    location: vscode.Location | vscode.LocationLink
): IDEService.Location {
    const range = "range" in location ? location.range : location.targetRange;
    const uri = "uri" in location ? location.uri : location.targetUri;
    const start = range.start;
    const end = range.end;

    const loc: IDEService.Location = {
        abspath: uri.fsPath,
        range: {
            start: {
                line: start.line,
                character: start.character,
            },
            end: {
                line: end.line,
                character: end.character,
            },
        },
    };

    return loc;
}
