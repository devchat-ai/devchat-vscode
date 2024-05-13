import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';


function copyFileSync(source: string, target: string) {
	const data = fs.readFileSync(source);
	if (!fs.existsSync(target)) {
		fs.writeFileSync(target, data);
	}
}

function copyDirSync(source: string, target: string) {
	// 创建目标目录
	fs.mkdirSync(target, { recursive: true });

	// 遍历目录中的所有文件和子目录
	const files = fs.readdirSync(source);
	for (const file of files) {
		const sourcePath = path.join(source, file);
		const targetPath = path.join(target, file);
		const stats = fs.statSync(sourcePath);
		if (stats.isDirectory()) {
			// 递归拷贝子目录
			copyDirSync(sourcePath, targetPath);
		} else {
			// 拷贝文件
			copyFileSync(sourcePath, targetPath);
		}
	}
}
