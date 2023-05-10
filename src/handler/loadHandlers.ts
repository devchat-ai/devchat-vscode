import { messageHandler } from './messageHandler';
import { codeApply } from './codeApply';
import { codeFileApply } from './codeFileApply';
import { convertCommand } from './convertCommand';
import { doCommit } from './doCommit';
import { historyMessages } from './historyMessages';
import { regCommandList } from './regCommandList';
import { regContextList } from './regContextList';
import { sendMessage, stopDevChat } from './sendMessage';
import { blockApply } from './showDiff';
import { showDiff } from './showDiff';
import { addConext } from './addContext';
import { addRefCommandContext } from './addRefCommandContext';
import { contextDetail } from './contextDetail';
import { listAllMessages } from './listMessages';


// 根据用户选择的context菜单，添加对应的context文件
// 应答消息： 
//   添加上下文文件信息： { command: 'appendContext', context: <context file> }
messageHandler.registerHandler('addContext', addConext);
// 将AI应答的代码块应用到当前激活视图中
// 应答消息： 无
messageHandler.registerHandler('code_apply', codeApply);
// 将AI应答的代码块应用到当前激活视图中，替换掉当前文件内容
// 应答消息： 无
messageHandler.registerHandler('code_file_apply', codeFileApply);
// 将command输入，转换为发送给AI的自然语言描述
// 应答消息： { command: 'convertCommand', result: <自然语言描述> }
messageHandler.registerHandler('convertCommand', convertCommand);
// 执行提交操作
// 应答消息： 无
messageHandler.registerHandler('doCommit', doCommit);
// 获取历史消息，用户视图显示时调用
// 应答消息： { command: 'historyMessages', result: <历史消息> }
// <历史消息>是一个列表，具体属性信息添加接口时确定
messageHandler.registerHandler('historyMessages', historyMessages);
// 注册命令列表
// 应答消息： { command: 'regCommandList', result: <命令列表> }
messageHandler.registerHandler('regCommandList', regCommandList);
// 注册context列表
// 应答消息： { command: 'regContextList', result: <context列表> }
messageHandler.registerHandler('regContextList', regContextList);
// 发送消息，将用户输入的消息发送给AI
// 应答消息： 
//    { command: 'receiveMessagePartial', text: <应答消息文本>, user: <user>, date: <date> }
//    { command: 'receiveMessage', hash: <消息hash>, text: text: <应答消息文本>, user: <user>, date: <date> }
messageHandler.registerHandler('sendMessage', sendMessage);
// 停止devchat，用于用户主动停止devchat
// 应答消息： 无
messageHandler.registerHandler('stopDevChat', stopDevChat);
// 显示diff
// 应答消息： 无
messageHandler.registerHandler('block_apply', blockApply);
// 显示diff，由于历史原因，同上
// 应答消息： 无
messageHandler.registerHandler('show_diff', showDiff);
// 处理用户输入的ref命令
// 应答消息： { command: 'appendContext', context: <context file> }
messageHandler.registerHandler('addRefCommandContext', addRefCommandContext);
// 获取context详情
// 应答消息： { command: 'contextDetailResponse', 'file':<context file>, result: <context file content> }
//  <context file content>是一个JSON字符串
messageHandler.registerHandler('contextDetail', contextDetail);
// Debug handler
messageHandler.registerHandler('listAllMessages', listAllMessages);

