import { messageHandler } from './messageHandler';
import { codeApply } from './codeApply';
import { codeFileApply } from './codeFileApply';
import { convertCommand } from './convertCommand';
import { doCommit } from './doCommit';
import { historyMessages } from './historyMessages';
import { regCommandList } from './regCommandList';
import { regContextList } from './regContextList';
import { sendMessage, stopDevChat, regeneration, deleteChatMessage } from './sendMessage';
import { blockApply } from './showDiff';
import { showDiff } from './showDiff';
import { addConext } from './addContext';
import { addRefCommandContext } from './addRefCommandContext';
import { contextDetail } from './contextDetail';
import { listAllMessages } from './listMessages';
import { regActionList } from './regActionList';
import { applyAction } from './applyAction';


// According to the context menu selected by the user, add the corresponding context file
// Response: { command: 'appendContext', context: <context file> }
messageHandler.registerHandler('addContext', addConext);
// Apply the code block replied by AI to the currently active view
// Response: none
messageHandler.registerHandler('code_apply', codeApply);
// Apply the code block replied by AI to the currently active view, replacing the current file content
// Response: none
messageHandler.registerHandler('code_file_apply', codeFileApply);
// Convert the command input into a natural language description sent to AI
// Response: { command: 'convertCommand', result: <natural language description> }
messageHandler.registerHandler('convertCommand', convertCommand);
// Perform commit operation
// Response: none
messageHandler.registerHandler('doCommit', doCommit);
// Get the history messages, called when the user view is displayed
// Response: { command: 'historyMessages', result: <history messages> }
// <history messages> is a list, the specific attribute information is determined when the interface is added
messageHandler.registerHandler('historyMessages', historyMessages);
// Register the command list
// Response: { command: 'regCommandList', result: <command list> }
messageHandler.registerHandler('regCommandList', regCommandList);
// Register the context list
// Response: { command: 'regContextList', result: <context list> }
messageHandler.registerHandler('regContextList', regContextList);
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
messageHandler.registerHandler('block_apply', blockApply);
// Show diff, for historical reasons, the same as above
messageHandler.registerHandler('show_diff', showDiff);
// Process the ref command entered by the user
// Response: { command: 'appendContext', context: <context file> }
messageHandler.registerHandler('addRefCommandContext', addRefCommandContext);
// Get context details
// Response: { command: 'contextDetailResponse', 'file':<context file>, result: <context file content> }
// <context file content> is a JSON string
messageHandler.registerHandler('contextDetail', contextDetail);
// Debug handler
messageHandler.registerHandler('listAllMessages', listAllMessages);
// Regeneration
// The response is the same as sendMessage
messageHandler.registerHandler('regeneration', regeneration);
// Register the action list
// Response: { command: 'regActionList', result: <action list> }
messageHandler.registerHandler('regActionList', regActionList);
// Apply action for code block
// Response: none
messageHandler.registerHandler('applyAction', applyAction);
// Delete chat message
// Response: { command: 'deletedChatMessage', result: <message id> }
messageHandler.registerHandler('deleteChatMessage', deleteChatMessage);
