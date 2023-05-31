
import * as childProcess from 'child_process';

import { UiUtilWrapper } from '../util/uiUtil';


export function checkDevChatDependency(): boolean {
	try {
	  // Get pipx environment
	  const pipxEnvOutput = childProcess.execSync('python3 -m pipx environment').toString();
	  const binPathRegex = /PIPX_BIN_DIR=\s*(.*)/;
  
	  // Get BIN path from pipx environment
	  const match = pipxEnvOutput.match(binPathRegex);
	  if (match && match[1]) {
		const binPath = match[1];
  
		// Add BIN path to PATH
		process.env.PATH = `${binPath}:${process.env.PATH}`;
  
		// Check if DevChat is installed
		childProcess.execSync('devchat --help');
		return true;
	  } else {
		return false;
	  }
	} catch (error) {
	  // DevChat dependency check failed
	  return false;
	}
  }

  export async function checkOpenaiApiKey() {
	let openaiApiKey = await UiUtilWrapper.secretStorageGet("devchat_OPENAI_API_KEY");
	if (!openaiApiKey) {
		openaiApiKey = UiUtilWrapper.getConfiguration('DevChat', 'API_KEY');
	}
	if (!openaiApiKey) {
		openaiApiKey = process.env.OPENAI_API_KEY;
	}
	if (!openaiApiKey) {
		return false;
	}
	return true;
}