// 代码分为多个block, 每个block包含一个变量集合
export interface BlockInfo {
    file: string;
    startLine: number;
    endLine: number;
    lastTime: number;
    identifiers: string[];
}

// 每个代码文件包含多个block
export interface FileBlockInfo {
    path: string;
    lastTime: number;
    blocks: BlockInfo[];
    hashKey: string;
}
