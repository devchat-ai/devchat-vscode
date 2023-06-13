import * as vscode from 'vscode';
import * as fs from 'fs';
import { MessageHandler } from './messageHandler';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from '../util/logger';


regInMessage({ command: 'contextDetail', file: '' });
regOutMessage({ command: 'contextDetailResponse', file: '', result: '' });
// message: { command: 'contextDetail', file: string }
// read detail context information from file
// return json string
export async function contextDetail(message: any, panel: vscode.WebviewPanel | vscode.WebviewView): Promise<void> { 
	try { 
		const fileContent = fs.readFileSync(message.file, 'utf-8'); 
		MessageHandler.sendMessage(panel, { command: 'contextDetailResponse', 'file': message.file, result: fileContent }); 
	} catch (error) { 
		logger.channel()?.error(`Error reading file ${message.file}: ${error}`); 
	} 
}
