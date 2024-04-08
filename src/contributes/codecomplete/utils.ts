import * as vscode from 'vscode';


export interface Range {
    start: Position;
    end: Position;
}
export interface Position {
    line: number;
    character: number;
}

export interface RangeInFile {
    filepath: string;
    range: Range;
}

export async function readRangeInFile(
    filepath: string,
    range: vscode.Range
): Promise<string> {
    const contents = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(vscode.Uri.file(filepath))
    );
    const lines = contents.split("\n");
    return (
        lines.slice(range.start.line, range.end.line).join("\n") +
        "\n" +
        lines[
            range.end.line < lines.length - 1 ? range.end.line : lines.length - 1
        ].slice(0, range.end.character)
    );
}

export async function readFileByVSCode(filepath: string): Promise<string> {
    const contents = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(vscode.Uri.file(filepath))
    );

    return contents;
}

export async function readRangesInFileContents( contents: string, lines: string[], range: Range ) {
    if (!lines) {
        lines = contents.split("\n");
    }

    if (range.start.line < range.end.line) {
        // TODO
        // handle start column
        return (
            lines.slice(range.start.line, range.end.line).join("\n") +
            "\n" +
            lines[
                range.end.line < lines.length - 1 ? range.end.line : lines.length - 1
            ].slice(0, range.end.character)
        );
    } else {
        // TODO
        // handle start column
        return lines[
            range.end.line < lines.length - 1 ? range.end.line : lines.length - 1
        ].slice(0, range.end.character);
    }
}

export async function readRangesInFile(
    filepath: string,
    ranges: Range[]
): Promise<string[]> {
    const contents = new TextDecoder().decode(
        await vscode.workspace.fs.readFile(vscode.Uri.file(filepath))
    );
    const lines = contents.split("\n");

    const result: string[] = [];
    for (const range of ranges) {
        result.push(
            (
                lines.slice(range.start.line, range.end.line).join("\n") +
                "\n" +
                lines[
                    range.end.line < lines.length - 1 ? range.end.line : lines.length - 1
                ].slice(0, range.end.character)
            )
        );
    }
    return result;
}