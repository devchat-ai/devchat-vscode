/*
 记录最近修改的内容，用于代码补全
*/
import { logger } from '../../util/logger';
import * as vscode from 'vscode';
import { collapseFile } from './ast/collapseBlock';
import { getCommentPrefix } from './ast/language';


export class RecentEdit {
    fileName: string;
    content: string;
    collapseContent: string;

    constructor(fileName: string, content: string) {
        this.fileName = fileName;
        this.content = content;
        this.collapseContent = "";
    }

    async close() {
        // collapse file
        this.collapseContent = await collapseFile(this.fileName, this.content);
    }

    async update(content: string) {
        this.content = content;
        this.collapseContent = "";
    }
}

export class RecentEditsManager {
    private edits: RecentEdit[];
    private maxCount: number = 10;

    constructor() {
        this.edits = [];

        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.scheme !== "file") {
                return;
            }
            // logger.channel()?.info(`onDidChangeTextDocument: ${e.document.fileName}`);
            // find edit
            let edit = this.edits.find(editFile => editFile.fileName === e.document.fileName);
            if (edit) {
                edit.update(e.document.getText());
            } else {
                this.edits.push(new RecentEdit(e.document.fileName, e.document.getText()));
            }
        });

        // onDidChangeActiveTextEditor: Event<TextEditor | undefined>
        vscode.window.onDidChangeActiveTextEditor(e => {
            if (e) {
                // logger.channel()?.info(`onDidChangeActiveTextEditor: ${e.document.fileName}`);
                // close last edit
                this.edits.forEach(edit => {
                    edit.close();
                });
                // move edit with the same file name to the end of the list
                let edit = this.edits.find(editFile => editFile.fileName === e.document.fileName);
                if (edit) {
                    this.edits.splice(this.edits.indexOf(edit), 1);
                    this.edits.push(edit);
                } else {
                    this.edits.push(new RecentEdit(e.document.fileName, e.document.getText()));
                }
            }
        });
    }

    public getEdits(): RecentEdit[] {
        return this.edits;
    }
}
