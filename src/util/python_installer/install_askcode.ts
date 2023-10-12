/*
 Install DevChat with python=3.11.4
 */

 import { FT } from "../feature_flags/feature_toggles";
import { logger } from "../logger";
 import { appInstall } from "./app_install"
 
 
 // python version: 3.11.4
 // pkg name: devchat
 // return: path to devchat, devchat is located in the same directory as python
 export async function installAskCode(): Promise<string> {
	 try {
		 logger.channel()?.info(`start installing AskCode with python=3.11.4 ...`);
		 let devchatAskVersion = '>=0.0.13';
		 if (FT("ask-code-summary")) {
			devchatAskVersion = '>=0.0.10';
		 }
		 const pythonCommand = await appInstall("devchat-ask", devchatAskVersion, '3.11.4');
		 if (!pythonCommand) {
			 logger.channel()?.error(`failed to install devchat-ask with python=3.11.4`);
			 logger.channel()?.show();
			 return '';
		 }
 
		 logger.channel()?.info(`installed devchat-ask with python=3.11.4 at ${pythonCommand}`);
		 return pythonCommand;
	 } catch (error) {
		 logger.channel()?.error(`${error}`);
		 logger.channel()?.show();
		 return '';
	 }
 }