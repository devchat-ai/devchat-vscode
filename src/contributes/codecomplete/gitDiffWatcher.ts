/* 
 写一个类，在这个类中监控项目文件是否发生变化，每次变化后，重新执行git diff命令，获取变化的文件列表，并将变化的文件列表返回给调用者。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';

import { UiUtilWrapper } from '../../util/uiUtil';
import { logger } from '../../util/logger';
import { collapseFile } from './ast/collapseBlock';
import { BLACK_LIST_DIRS } from './astIndex/index';

interface AddFileContent {
    file: string;
    lastModifiedTime: number;
    collapseContext: string;
}

export class GitDiffWatcher {
    private static instance: GitDiffWatcher;
    private gitDiffWatcher: vscode.FileSystemWatcher;
    private gitDiff: string;
    private gitDiffResult: string;
    private gitAddedFilesCollapseContext: AddFileContent[];
    private workspaceDir: string;
    private hasRun: boolean;

    private constructor() {
        this.gitDiff = "git diff -w";
        this.gitDiffResult = "";
        this.gitAddedFilesCollapseContext = [];
        this.workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath() || '.';
        this.gitDiffWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        this.hasRun = false;

        this.gitDiffWatcher.onDidChange(this.onDidChangeWithBlackList, this);
        this.gitDiffWatcher.onDidCreate(this.onDidChangeWithBlackList, this);
        this.gitDiffWatcher.onDidDelete(this.onDidChangeWithBlackList, this);
    }

    // 提供一个公共静态方法来获取类的单例
    public static getInstance(): GitDiffWatcher {
        if (!GitDiffWatcher.instance) {
            GitDiffWatcher.instance = new GitDiffWatcher();
        }
        return GitDiffWatcher.instance;
    }

    private async runGitDiffCommand(): Promise<string> {
        return new Promise((resolve, reject) => {
            // 设置workspaceDir作为子进程的工作目录
            const options = { cwd: this.workspaceDir };
            // 执行git diff命令，并将结果作为Promise的resolve值返回
            exec(this.gitDiff, options, (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                resolve(stdout);
              }
            });
        });
    }

    public async getNewlyAddedFiles(): Promise<string[]> {
        const gitStatusShort = "git status --short";
        const options = { cwd: this.workspaceDir };
        try {
            const output = await new Promise<string>((resolve, reject) => {
                exec(gitStatusShort, options, (error, stdout, stderr) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(stdout);
                });
            });

            // 解析stdout来找出新添加的文件
            // 新添加的文件在`git status --short`命令输出中以'A'作为前缀
            const lines = output.split('\n');
            const addedFiles = lines
                .filter(line => line.trim().startsWith('A') || line.trim().startsWith('?'))
                .map(line => line.trim().substring(2).trim())
                .map(file => path.resolve(this.workspaceDir, file)); // 将相对路径转换为绝对路径

            return addedFiles;
        } catch (error) {
            logger.channel()?.info(`Failed to run git status --short command: ${error}`);
            return []; // 发生错误时返回空数组
        }
    }

    public async onDidChangeWithBlackList(uri: vscode.Uri) {
        const file = uri.fsPath;
        for (const blackDir of BLACK_LIST_DIRS) {
            if (file.includes(path.sep + blackDir + path.sep)) {
                return;
            }
        }
        this.onDidChange();
    }

    public async onDidChange() {
        // 执行git diff命令，获取变化的文件列表
        // TODO
        // 根据观察，添加diff数据后会有不稳定的输出补全结果出现，
        // 猜测可能是因为diff信息没有出现在训练数据中。
        // 因此，暂时先不使用diff信息。
        return;
        // try {
        //     this.gitDiffResult = await this.runGitDiffCommand();
        //     const gitAddedFiles = await this.getNewlyAddedFiles();
        //     for (const file of gitAddedFiles) {
        //         // 获取文件的最后修改时间，判断是否已经再次发生了变化
        //         const lastModifiedTime = fs.statSync(file).mtimeMs;
        //         // 查找文件是否已经存在于gitAddedFilesCollapseContext中
        //         const existingFile = this.gitAddedFilesCollapseContext.find(f => f.file === file);
        //         if (existingFile && existingFile.lastModifiedTime === lastModifiedTime) {
        //             // 文件已经存在于gitAddedFilesCollapseContext中，并且没有发生变化，则跳过
        //             continue;
        //         }

        //         const fileContent = await fs.promises.readFile(file, 'utf8');
        //         const collapseContext = await collapseFile(file, fileContent);

        //         // 将文件信息添加到gitAddedFilesCollapseContext中
        //         this.gitAddedFilesCollapseContext.push({ file, lastModifiedTime, collapseContext });
        //     }

        //     // 移除已经不在git diff结果中的文件
        //     this.gitAddedFilesCollapseContext = this.gitAddedFilesCollapseContext.filter(f => {
        //         // 判断文件是否在gitAddedFiles中
        //         return gitAddedFiles.includes(f.file);
        //     });
        // } catch (error) {
        //     logger.channel()?.info(`Failed to run git diff command: ${error}`);
        // }
    }

    public async tryRun() {
        if (!this.hasRun) {
            try {
                this.onDidChange();
                this.hasRun = true;
            } catch (error) {
                logger.channel()?.info(`Failed to run git diff command: ${error}`);
            }
        }
    }

    // 获取git diff result
    public getGitDiffResult(): string {
        return this.gitDiffResult;
    }

    // 获取git added files
    public getGitAddedFiles(): { fileName: string, content: string, collapseContent: string }[] {
        return this.gitAddedFilesCollapseContext.map(f => {
            return {
                fileName: f.file,
                content: f.collapseContext,
                collapseContent: f.collapseContext
            };
        });
    }
}
