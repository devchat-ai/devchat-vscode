import { messageHandler } from './messageHandler';
import { insertCodeBlockToFile } from './codeBlockHandler';
import { replaceCodeBlockToFile } from './codeBlockHandler';
import { doCommit } from './commitHandler';
import { getHistoryMessages } from './historyMessagesHandler';
import { handleRegCommandList,handleUpdateWorkflowList } from './workflowCommandHandler';
import { sendMessage, stopDevChat, regeneration, deleteChatMessage, userInput } from './sendMessage';
import { applyCodeWithDiff } from './diffHandler';
import { addConext } from './contextHandler';
import { getContextDetail } from './contextHandler';
import {createAndOpenFile} from './codeBlockHandler';
import { listAllMessages } from './listMessages';
import { doVscodeCommand } from './vscodeCommandHandler';
import { readFile, writeFile, getIDEServicePort, getCurrentFileInfo } from './fileHandler';
import { getTopics, deleteTopic } from './topicHandler';
import { readConfig, writeConfig, readServerConfigBase, writeServerConfigBase } from './configHandler';


// According to the context menu selected by the user, add the corresponding context file
// Response: { command: 'appendContext', context: <context file> }
messageHandler.registerHandler('addContext', addConext);
// Apply the code block replied by AI to the currently active view
// Response: none
messageHandler.registerHandler('code_apply', insertCodeBlockToFile);
// Apply the code block replied by AI to the currently active view, replacing the current file content
// Response: none
messageHandler.registerHandler('code_file_apply', replaceCodeBlockToFile);
// Apply the code block to a new file
messageHandler.registerHandler('code_new_file', createAndOpenFile);
// Perform commit operation
// Response: none
messageHandler.registerHandler('doCommit', doCommit);
// Get the history messages, called when the user view is displayed
// Response: { command: 'historyMessages', result: <history messages> }
// <history messages> is a list, the specific attribute information is determined when the interface is added
messageHandler.registerHandler('historyMessages', getHistoryMessages);
// Register the command list
// Response: { command: 'regCommandList', result: <command list> }
messageHandler.registerHandler('regCommandList', handleRegCommandList);
messageHandler.registerHandler('updateWorkflowList', handleUpdateWorkflowList);
// Send a message, send the message entered by the user to AI
// Response:
//    { command: 'receiveMessagePartial', text: <response message text>, user: <user>, date: <date> }
//    { command: 'receiveMessagePartial', text: <response message text>, user: <user>, date: <date> }
messageHandler.registerHandler('sendMessage', sendMessage);
// Stop devchat, used to stop devchat by the user
// Response: none
messageHandler.registerHandler('stopDevChat', stopDevChat);
// Show diff
// Response: none
// Show diff, for historical reasons, the same as above
messageHandler.registerHandler('show_diff', applyCodeWithDiff);
// Get context details
// Response: { command: 'contextDetailResponse', 'file':<context file>, result: <context file content> }
// <context file content> is a JSON string
messageHandler.registerHandler('contextDetail', getContextDetail);
// Debug handler
messageHandler.registerHandler('listAllMessages', listAllMessages);
// Regeneration
// The response is the same as sendMessage
messageHandler.registerHandler('regeneration', regeneration);
// Delete chat message
// Response: { command: 'deletedChatMessage', result: <message id> }
messageHandler.registerHandler('deleteChatMessage', deleteChatMessage);

// Execute vscode command
// Response: none
messageHandler.registerHandler('doCommand', doVscodeCommand);

messageHandler.registerHandler('userInput', userInput);

messageHandler.registerHandler('readFile', readFile);
messageHandler.registerHandler('writeFile', writeFile);

messageHandler.registerHandler('getTopics', getTopics);
messageHandler.registerHandler('deleteTopic', deleteTopic);

messageHandler.registerHandler('readConfig', readConfig);
messageHandler.registerHandler('writeConfig', writeConfig);

messageHandler.registerHandler('getCurrentFileInfo', getCurrentFileInfo);
messageHandler.registerHandler('getIDEServicePort', getIDEServicePort);

messageHandler.registerHandler('readServerConfigBase', readServerConfigBase);
messageHandler.registerHandler('writeServerConfigBase', writeServerConfigBase);


