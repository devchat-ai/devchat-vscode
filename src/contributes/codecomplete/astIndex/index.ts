import * as path from 'path';
import * as fsE from 'fs';
import fs from 'fs/promises';
import { logger } from '../../../util/logger';
import { getFileBlock } from '../symbolindex/embedding';
import { UiUtilWrapper } from '../../../util/uiUtil';
import { getLanguageFullName } from '../ast/language';
import { DevChatConfig } from '../../../util/config';
import { IndexStore, SimilarBlock } from './indexStore';
import { FileBlockInfo } from './types';
import { createFileBlockInfo, createIdentifierSetByQuery } from './createIdentifierSet';


let indexStore: IndexStore | undefined = undefined;
const devchatConfig = new DevChatConfig();

const BLACK_LIST_DIRS = [
    "node_modules",
    ".git",
    ".vscode",
    ".github",
    ".idea",
    "dist",
    "build",
    "out",
    "bin",
    "__pycache__",
    ".venv",
    ".eggs",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".m2",
    "target",
    ".gradle",
    "cmake-build-debug",
    "vendor",
    "lib",
    "libs",
    "packages",
    "Packages",
    "deps",
    "site-packages"
];

export async function indexDir(dir: string) {
    // create index for db
    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    if (!workspaceDir) {
        return ;
    }

    // 确保.chat/index目录存在
    if (!fsE.existsSync(path.join(workspaceDir, ".chat", "index"))) {
        fsE.mkdirSync(path.join(workspaceDir, ".chat", "index"), { recursive: true });
    }

    indexStore = new IndexStore();
    await indexStore.load();
    const indexDirImpl = async (dir: string) => {
        let indexUpdated: boolean = false;

        // 读取配置，判断是否启用了代码补全
        if (devchatConfig.get("complete_index_enable") !== true) {
            return;
        }

        // 遍历目录中所有ts文件
        for await (const file of listFilesRecursively(dir)) {
            // 判断文件是否是ts文件
            if (!await getLanguageFullName(file)) {
                continue;
            }

            // 判断文件是否被修改过
            const lastModifiedTime = (await fs.stat(file)).mtimeMs;
            const fileBlocInfo: FileBlockInfo | undefined = indexStore!.get(file);

            if (fileBlocInfo && fileBlocInfo.lastTime === lastModifiedTime) {
                continue;
            }

            try {
                logger.channel()?.info(`Indexing ${file}`);
                const newFileBlockInfo = await createFileBlockInfo(file);
                if (newFileBlockInfo) {
                    await indexStore!.add(newFileBlockInfo);
                    indexUpdated = true;
                }
            } catch (err) {
                logger.channel()?.error(`${err}`);
            }
        }

        if (indexUpdated) {
            try {
                await indexStore!.save();
            } catch (err) {
                logger.channel()?.error(`${err}`);
            }
        }
    };

    // 立即执行一次
    await indexDirImpl(dir);
    // 启动定时器，每隔10分钟检查一次目录中的文件是否有修改
    setInterval(indexDirImpl, 3 * 60 * 1000, dir);
}


export async function searchSimilarBlock(filepath: string, contents: string, line: number, limit: number) {
    const startTime = performance.now();
    if (devchatConfig.get("complete_index_enable") !== true) {
        return [];
    }
    if (!indexStore) {
        indexStore = new IndexStore();
    }

    const lineBlock: string = await getFileBlock(filepath, contents, line);
    const startTimer2 = performance.now();
    const identifiers = await createIdentifierSetByQuery(filepath, lineBlock);
    const similarBlocks: SimilarBlock[] = await indexStore.search(identifiers, limit+5);
    const endTimer2 = performance.now();
    logger.channel()?.info(`searchSimilarBlock2:  ${endTimer2 - startTimer2}ms`);
    
    // 过滤掉当前文件
    let similarBlocksFiltered = similarBlocks.filter(block => block.block.file !== filepath);
    
    let blocksText: {file: string, text: string}[] = [];
    for (const block of similarBlocksFiltered) {
        // 判断blockFile文件是否存在，以及最后修改时间是否与block.lastTime相同
        if (!fsE.existsSync(block.block.file) || (await fs.stat(block.block.file)).mtimeMs!== block.block.lastTime) {
            continue;
        }

        const content = await fs.readFile(block.block.file, 'utf8');
        const lines = content.split('\n');
        const blockText = lines.slice(block.block.startLine, block.block.endLine + 1).join('\n');

        blocksText.push({
            file: block.block.file,
            text: blockText,
        });
        if (blocksText.length >= limit) {
            break;
        }
    }
    const endTime = performance.now();
    logger.channel()?.info(`searchSimilarBlock:  ${endTime - startTime}ms`);

    return blocksText;
}


async function* listFilesRecursively(dir: string): AsyncGenerator<string> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const fullPath = path.join(dir, dirent.name);
        // 检查是否在黑名单目录中
        if (BLACK_LIST_DIRS.some(blackDir => blackDir === dirent.name)) {
            continue;
        }
        if (dirent.isDirectory()) {
            yield* listFilesRecursively(fullPath); // 如果是目录，则递归地遍历
        } else {
            yield fullPath; // 产生文件的路径
        }
    }
}