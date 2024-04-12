
import * as fs from 'fs';
import * as path from 'path';
// 对代码文件进行管理，记录每个文件的block信息
// 同时支持本地文件存储结果，以及支持针对新变量集合进行相似度计算，并返回相似度最高的一组block
import { BlockInfo, FileBlockInfo } from "./types";
import { UiUtilWrapper } from '../../../util/uiUtil';

// difine interface for {score: number, block: BlockInfo}
export interface SimilarBlock {
    score: number;
    block: BlockInfo;
}

export class IndexStore {
    private index: Map<string, FileBlockInfo> = new Map();
    private storePath: string;

    constructor() {
        const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
        if (!workspaceDir) {
            this.storePath = "";
            return ;
        }
        this.storePath = path.join(workspaceDir, ".chat", "index", "index.json");
    }

    //  获取文件block信息
    public get(file: string): FileBlockInfo | undefined {
        return this.index.get(file);
    }

    public async load(): Promise<boolean> {
        // 读取写入的文件，并解析为index变量
        if (this.storePath === "" || !fs.existsSync(this.storePath)) {
            return false;
        }

        const content = await fs.promises.readFile(this.storePath, 'utf-8');
        const index = JSON.parse(content);
        this.index = new Map(Object.entries(index));
        return true;
    }

    public async save(): Promise<boolean> {
        if (this.storePath === "") {
            return false;
        }

        // 将index变量写入文件
        const content = JSON.stringify(Object.fromEntries(this.index));
        await fs.promises.writeFile(this.storePath, content, 'utf-8');
        return true;
    }

    public async search(identifiers: string[], limit: number): Promise<SimilarBlock[]> {
        // 遍历所有文件中block，计算相似度，返回相似度最高的一组block
        const similarBlocks: SimilarBlock[] = [];

        for (const [file, fileBlocInfo] of this.index) {
            for (const block of fileBlocInfo.blocks) {
                // 计算相似度
                const similarity = this.similar(identifiers, block.identifiers);
                if (similarity === 0) {
                    continue;
                }

                // 根据相似度插入到similarBlocks数组中
                let index = 0;
                while (index < similarBlocks.length && similarBlocks[index].score > similarity) {
                    index++;
                }
                if (index === similarBlocks.length) {
                    similarBlocks.push({score: similarity, block});
                } else {
                    similarBlocks.splice(index, 0, {score: similarity, block});
                }

                // 限制返回的数量
                if (similarBlocks.length > limit) {
                    similarBlocks.pop();
                }
            }
        }

        return similarBlocks;
    }

    public similar(setA: string[], setB: string[]): number {
        if (setA.length === 0 || setB.length === 0) {
            return 0;
        }

        // 相似度 = 交集 / setA.length
        let count = 0;            // 用来计数共有元素的数量
        let i = 0, j = 0;         // 初始化两个指针

        while (i < setA.length && j < setB.length) {
            if (setA[i] === setB[j]) {
                count++;          // 找到一个共有元素，计数器加一
                i++;              // 移动两个指针
                j++;
            } else if (setA[i] < setB[j]) {
                i++;              // 只移动setA的指针
            } else {
                j++;              // 只移动setB的指针
            }
        }

        return (count / setA.length)*0.7 + (count / setB.length)*0.3;
    }

    public async addBlocksToFile(file: string, hashKey: string, blocks: BlockInfo[]) {
        // 遍历blocks，将每个block添加到index中
        for (const block of blocks) {
            const fileBlockInfo = this.index.get(file);
            if (fileBlockInfo) {
                fileBlockInfo.blocks.push(block);
            } else {
                this.index.set(file, {path: file, lastTime: Date.now(), blocks: [block], hashKey: hashKey});
            }
        }
    }

    // add FileBlockInfo
    public async add(fileBlockInfo: FileBlockInfo) {
        this.index.set(fileBlockInfo.path, fileBlockInfo);
    }
}