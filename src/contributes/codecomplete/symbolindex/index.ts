import * as path from 'path';
import * as fsE from 'fs';
import fs from 'fs/promises';
import { logger } from '../../../util/logger';
import { embeddingQuery, embeddingBlocks, getFileBlock } from './embedding';
import { UiUtilWrapper } from '../../../util/uiUtil';
import { getLanguageFullName } from '../ast/language';
import { DevChatConfig } from '../../../util/config';

// copy encoder.json from tools to dist
// const encoderPath = path.join(__dirname, "..", "tools", "gpt-token", 'encoder.json');
// const encoderTargetPath = path.join(__dirname, 'encoder.json');
// if (fsE.existsSync(encoderPath) && !fsE.existsSync(encoderTargetPath)) {
//     fsE.copyFileSync(encoderPath, encoderTargetPath );
// }
// const vocabPath = path.join(__dirname, "..", "tools", "gpt-token", 'vocab.bpe');
// const vocabTargetPath = path.join(__dirname, 'vocab.bpe');
// if (fsE.existsSync(vocabPath) && !fsE.existsSync(vocabTargetPath)) {
//     fsE.copyFileSync(vocabPath, vocabTargetPath );
// }

// import { LocalIndex } from 'vectra';
// let index: LocalIndex | undefined = undefined;


// 记录文件的最后修改时间
const lastModified = new Map<string, number>();
const devchatConfig = DevChatConfig.getInstance();

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

export async function loadLastModified(filepath: string) {
    // read filepath, load lastModifed map data
    try {
        if (!fsE.existsSync(filepath)) {
            return;
        }
    
        const data = await fs.readFile(filepath, 'utf8');
        if (!data) {
            return;
        }
    
        const lastModifiedData = JSON.parse(data) as {[key: string]: number};
        for (const [key, value] of Object.entries(lastModifiedData)) {
            lastModified.set(key, value);
        }
    } catch (err) {
        logger.channel()?.error(`${err}`);
    }
}

export async function saveLastModified(filepath: string) {
    // save lastModifed map data to filepath
    try {
        const lastModifiedData = {};
        for (const [key, value] of lastModified.entries()) {
            lastModifiedData[key] = value;
        }
        await fs.writeFile(filepath, JSON.stringify(lastModifiedData));
    } catch (err) {
        logger.channel()?.error(`${err}`);
    }
}

// export async function indexDir(dir: string) {
//     // create index for db
//     const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
//     if (!workspaceDir) {
//         return ;
//     }

//     // 确保.chat/index目录存在
//     if (!fsE.existsSync(path.join(workspaceDir, ".chat", "index"))) {
//         fsE.mkdirSync(path.join(workspaceDir, ".chat", "index"), { recursive: true });
//     }

//     if (!index) {
//         index = new LocalIndex(path.join(workspaceDir, '.chat', 'index'));
//     }
//     if (!await index.isIndexCreated()) {
//         await index.createIndex();
//     }

//     await loadLastModified(path.join(workspaceDir, ".chat", "index", 'lastModified.json'));

//     const indexDirImpl = async (dir: string) => {
//         let indexUpdated: boolean = false;

//         // 读取配置，判断是否启用了代码补全
//         if (devchatConfig.get("complete_index_enable") !== true) {
//             return;
//         }

//         // 遍历目录中所有ts文件
//         for await (const file of listFilesRecursively(dir)) {
//             // 判断文件是否是ts文件
//             if (!await getLanguageFullName(file)) {
//                 continue;
//             }

//             // 判断文件是否被修改过
//             const lastModifiedTime = (await fs.stat(file)).mtimeMs;
//             if (lastModified.has(file) && lastModified.get(file) === lastModifiedTime) {
//                 continue;
//             }

//             try {
//                 if (await indexFile(file)) {
//                     indexUpdated = true;
//                     // 记录文件最后修改时间
//                     lastModified.set(file, lastModifiedTime);
//                 }
//             } catch (err) {
//                 logger.channel()?.error(`${err}`);
//             }
//         }

//         if (indexUpdated) {
//             try {
//                 await index!.cancelUpdate();
//                 await index!.beginUpdate();
//                 await index!.endUpdate();
//                 await saveLastModified(path.join(workspaceDir, ".chat", "index", 'lastModified.json'));
//             } catch (err) {
//                 logger.channel()?.error(`${err}`);
//             }
//         }
//     };

//     // 立即执行一次
//     await indexDirImpl(dir);
//     // 启动定时器，每隔10分钟检查一次目录中的文件是否有修改
//     setInterval(indexDirImpl, 3 * 60 * 1000, dir);
// }

// export async function indexFile(filepath: string) {
//     // create index for db
//     const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
//     if (!workspaceDir) {
//         return ;
//     }

//     // 确保.chat/index目录存在
//     if (!fsE.existsSync(path.join(workspaceDir, ".chat", "index"))) {
//         fsE.mkdirSync(path.join(workspaceDir, ".chat", "index"), { recursive: true });
//     }

//     if (!index) {
//         index = new LocalIndex(path.join(workspaceDir, '.chat', 'index'));
//     }

//     if (!await index.isIndexCreated()) {
//         await index.createIndex();
//     }

//     logger.channel()?.info(`Indexing ${filepath}`);

//     // 对文件获取词向量
//     const embeddingData: {vector: number[], meta: {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}}[] | undefined = await embeddingBlocks(filepath);
//     if (!embeddingData || !embeddingData.length) {
//         return true;
//     }

//     // 写入向量数据库
//     let indexUpdated: boolean = false;
//     for (const embedding of embeddingData) {
//         try {
//             await index.insertItem({
//                 vector: embedding.vector,
//                 metadata: embedding.meta,
//                 id: embedding.meta.hashKey,
//             });
//             indexUpdated = true;
//         } catch (err) {
//             const errMsg = `${err}`;
//             // Error: Item with id c6120dd306cc49cb3cc3dac3b2b03d882c46e50a7eedde996d615e36585afe14 already exists
//             if (errMsg.startsWith('Error: Item with id')) {
//                 indexUpdated = true;
//                 continue;
//             }
//             logger.channel()?.info(`${err}`);
//         }
//     }
//     return indexUpdated;
// }

// export async function searchSimilarBlock(filepath: string, contents: string, line: number, limit: number) {
//     const startTime = performance.now();
//     const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
//     if (!workspaceDir) {
//         return [];
//     }
//     if (devchatConfig.get("complete_index_enable") !== true) {
//         return [];
//     }

//     // 基于workspaceDir计算当前文件的相对路径
//     const relativePath = path.relative(workspaceDir, filepath);

//     const lineBlock: string = await getFileBlock(filepath, contents, line);
//     const startTimer2 = performance.now();
//     const similarBlocks: {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}[] = await search(filepath, lineBlock, limit + 5);
//     const endTimer2 = performance.now();
//     logger.channel()?.info(`searchSimilarBlock2:  ${endTimer2 - startTimer2}ms`);
    
//     // 过滤掉当前文件
//     let similarBlocksFiltered = similarBlocks.filter(block => block.path!== relativePath);
    
//     let blocksText: {file: string, text: string}[] = [];
//     for (const block of similarBlocksFiltered) {
//         const blockFile = path.join(workspaceDir, block.path);
//         // 判断blockFile文件是否存在，以及最后修改时间是否与block.lastTime相同
//         if (!fsE.existsSync(blockFile) || (await fs.stat(blockFile)).mtimeMs!== block.lastTime) {
//             continue;
//         }

//         const content = await fs.readFile(blockFile, 'utf8');
//         const lines = content.split('\n');
//         const blockText = lines.slice(block.startLine, block.endLine + 1).join('\n');

//         blocksText.push({
//             file: block.path,
//             text: blockText,
//         });
//         if (blocksText.length >= limit) {
//             break;
//         }
//     }
//     const endTime = performance.now();
//     logger.channel()?.info(`searchSimilarBlock:  ${endTime - startTime}ms`);

//     return blocksText;
// }

// export async function search(filepath: string, query: string, limit: number): Promise< {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}[] > {
//     // create index for db
//     const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
//     if (!workspaceDir) {
//         return [];
//     }

//     if (!index) {
//         index = new LocalIndex(path.join(workspaceDir, '.chat', 'index'));
//     }
//     if (!await index.isIndexCreated()) {
//         await index.createIndex();
//     }

//     // 计算query的词向量
//     const queryVector: number[] | undefined = await embeddingQuery(filepath, query);
//     if (!queryVector) {
//         return [];
//     }

//     // 搜索相似的词向量
//     const results = await index.queryItems(queryVector, limit);
//     if (results.length > 0) {
//         for (const result of results) {
//             console.log(`[${result.score}] ${result.item.metadata.path} ${result.item.metadata.startLine}-${result.item.metadata.endLine}`);
//         }
//     } else {
//         console.log(`No results found.`);
//     }

//     return results.map(
//         result => result.item.metadata as {path: string, lastTime: number, startLine: number, endLine: number, hashKey: string}
//     );
// }

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