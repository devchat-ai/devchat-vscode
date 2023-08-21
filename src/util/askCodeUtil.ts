/*
Util for askCode
*/

import * as fs from 'fs';
import * as path from 'path';
import { UiUtilWrapper } from './uiUtil';

let indexingStatus = 'stopped'; // 'started' | 'indexing' | 'stopped'

export function updateLastModifyTime() {
	const workspaceFolder = UiUtilWrapper.workspaceFoldersFirstPath();
	if (!workspaceFolder) {
		return;
	}

    let files = fs.readdirSync(workspaceFolder).filter(file => !file.startsWith('.'));

    let lastModifyTime = {};
    for (let file of files) {
        let stats = fs.statSync(path.join(workspaceFolder, file));
        lastModifyTime[file] = stats.mtime.toUTCString();
    }

    fs.writeFileSync(path.join(workspaceFolder, '.chat', '.lastModifyTime.json'), JSON.stringify(lastModifyTime));
}

export function isNeedIndexingCode() {
	const workspaceFolder = UiUtilWrapper.workspaceFoldersFirstPath();
	if (!workspaceFolder) {
		return false;
	}

	let lastModifyTimeFile = path.join(workspaceFolder, '.chat', '.lastModifyTime.json');
	if (!fs.existsSync(lastModifyTimeFile)) {
		return true;
	}

	let files = fs.readdirSync(workspaceFolder).filter(file => !file.startsWith('.'));

	// load lastModifyTime from .chat/.lastModifyTime.json
	let lastModifyTime = {};
	if (fs.existsSync(lastModifyTimeFile)) {
		lastModifyTime = JSON.parse(fs.readFileSync(lastModifyTimeFile, 'utf-8'));
	}

    for (let file of files) {
        let stats = fs.statSync(path.join(workspaceFolder, file));
		if (!lastModifyTime[file] || stats.mtime.toUTCString() !== lastModifyTime[file]) {
			return true;
		}
    }
	if (Object.keys(lastModifyTime).length !== files.length) {
		return true;
	}
	return false;
}

export function updateIndexingStatus(status: string) {
	if (status === "started") {
		updateLastModifyTime();
	}
	indexingStatus = status;
}

export function isIndexingStopped() {
	return indexingStatus === 'stopped';
}
