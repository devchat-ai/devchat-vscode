import * as path from 'path';
import * as fs from 'fs';
import { ChatContext } from './contextManager';
import { createTempSubdirectory, runCommandStringAndWriteOutput } from '../util/commonUtil';

import { logger } from '../util/logger';
import { UiUtilWrapper } from '../util/uiUtil';
import { askcodeSummaryIndex, addSummaryContextFun } from '../contributes/commands';


export const askSummaryContext: ChatContext = {
  name: 'askcode summary',
  description: 'summary of file or directory',
  
  handler: async () => {
	const uriPath = await UiUtilWrapper.showInputBox({
		prompt: 'File or directory to summary',
		placeHolder: 'for example: /some/src'
	});

	if (uriPath) {
		// check uriPath is absolute path or relative path
		let uriPathAbs = uriPath;
		if (!path.isAbsolute(uriPath)) {
			// covert uriPath to absolute path, base path is workspacePath
			const workspacePath = UiUtilWrapper.workspaceFoldersFirstPath();
			if (!workspacePath) {
				logger.channel()?.error(`The workspace is not opened!`);
				logger.channel()?.show();
				return [];
			}
			uriPathAbs = path.join(workspacePath, uriPath);
		}
		
		logger.channel()?.info(`Your input path is: ${uriPathAbs}`);
		if (!fs.existsSync(uriPathAbs)) {
			logger.channel()?.error(`The path ${uriPath} is not exist!`);
			logger.channel()?.show();
			return [];
		}

		// index the file or directory
		await askcodeSummaryIndex(uriPathAbs);

		// summary the file or directory
		await addSummaryContextFun(uriPathAbs);
	}
	return [];
  },
};
