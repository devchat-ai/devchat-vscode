/*
 针对代码补全功能，构建prompt

 prompt的好坏，取决于提供的上下文信息。
 通过AST获取相对完整的信息，可能会增加提示的准确度，但也会增加代码提示的复杂度。
 */

import { logger } from "../../util/logger";
import { log } from "console";


const PREFIX_MAX_SIZE: number = 600;
const SUFFIX_MAX_SIZE: number = 400;

// 尽量获取一个完整的代码片段作为代码补全的上下文
// 解析AST是一个好的方法，但还是会有点偏重计算。先尝试通过缩进来定位合适的块。
// 整体范围保持在30行代码以内。
async function curfilePrompt(filePath: string, fileContent: string, line: number, column: number) {
    // 以line, column为中心，向前后扩展, 按行找出符合PREFIX_MAX_SIZE， SUFFIX_MAX_SIZE长度显示的prefix, suffix
    // 分割文件内容为行数组
    const lines = fileContent.split('\n');

    // 初始化prefix和suffix内容及长度
    let prefix = '';
    let suffix = '';
    let prefixSize = 0;
    let suffixSize = 0;

    // 从光标所在行开始，向上构建前缀
    for (let i = line; i >= 0; i--) {
        let lineText: string = lines[i] + '\n';
        if (i === line) {
            lineText = lines[i].substring(0, column);
        }

        prefix = lineText + prefix;
        prefixSize += lineText.length;
        if (prefixSize > PREFIX_MAX_SIZE) {
            break;
        }
    }

    // 从光标所在行下一行开始，向下构建后缀
    for (let i = line; i < lines.length; i++) {
        let lineText = lines[i] + '\n';
        if (i === line) {
            lineText = lines[i].substring(column, lines[i].length) + '\n';
        }

        suffix += lineText;
        suffixSize += lineText.length;
        if (suffixSize > PREFIX_MAX_SIZE) {
            break;
        }
    }

    // 返回前缀和后缀
    return {
        prefix,
        suffix
    };
}

export async function createPrompt(filePath: string, fileContent: string, line: number, column: number) {
    const { prefix, suffix } = await curfilePrompt(filePath, fileContent, line, column);
    const prompt = "<fim_prefix>" + prefix + "<fim_suffix>" + suffix + "<fim_middle>";

    return prompt;
}