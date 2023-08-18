import { types, flow, Instance } from "mobx-state-tree";
import messageUtil from '@/util/MessageUtil';
import { ChatContext } from '@/views/stores/InputStore';

interface Context {
    content: string;
    role: string;
}

interface Entry {
    hash: string;
    type: string,
    user: string;
    date: string;
    request: string;
    response: string;
    context: Context[];
}

interface LoadHistoryMessage {
    command: string;
    entries: Entry[];
}

export const fetchHistoryMessages = async (params) => {
    const { pageIndex } = params;
    return new Promise<{ pageIndex: number, entries: Entry[] }>((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'historyMessages', page: pageIndex });
            messageUtil.registerHandler('loadHistoryMessages', (message: LoadHistoryMessage) => {
                resolve({
                    pageIndex: pageIndex,
                    entries: message.entries
                });
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const deleteMessage = async (item: IMessage) => {
    const { hash } = item;
    return new Promise<{ hash: string }>((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'deleteChatMessage', hash: hash });
            messageUtil.registerHandler('deletedChatMessage', (message) => {
                resolve({
                    hash: message.hash
                });
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const Message = types.model({
    index: types.maybe(types.number),
    hash: types.maybe(types.string),
    type: types.enumeration(['user', 'bot', 'system']),
    message: types.string,
    contexts: types.maybe(types.array(ChatContext)),
});

export const ChatStore = types.model('Chat', {
    generating: false,
    responsed: false,
    currentMessage: '',
    hasDone: false,
    errorMessage: '',
    messages: types.array(Message),
    pageIndex: 0,
    isLastPage: false,
    isBottom: true,
    isTop: false,
})
    .actions(self => ({
        startGenerating: (text: string, chatContexts) => {
            self.generating = true;
            self.responsed = false;
            self.hasDone = false;
            self.errorMessage = '';
            self.currentMessage = '';
            let lastNonEmptyHash;
            for (let i = self.messages.length - 1; i >= 0; i--) {
                if (self.messages[i].hash) {
                    lastNonEmptyHash = self.messages[i].hash;
                    break;
                }
            }
            // Process and send the message to the extension
            const contextInfo = chatContexts.map((item, index: number) => {
                const { file, path, content, command } = item;
                return {
                    file,
                    context: {
                        path: path,
                        command: command,
                        content: content,
                    }
                };
            });
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: text,
                contextInfo: contextInfo,
                parent_hash: lastNonEmptyHash === 'message' ? null : lastNonEmptyHash
            });
        },
        startSystemMessage: () => {
            self.generating = true;
            self.responsed = false;
            self.hasDone = false;
            self.errorMessage = '';
            self.currentMessage = '';
        },
        reGenerating: () => {
            self.generating = true;
            self.responsed = false;
            self.hasDone = false;
            self.errorMessage = '';
            self.currentMessage = '';
            self.messages.pop();
            messageUtil.sendMessage({
                command: 'regeneration'
            });
        },
        stopGenerating: (hasDone: boolean, message: Instance<typeof Message> | Instance<typeof types.null>) => {
            self.generating = false;
            self.responsed = false;
            self.hasDone = hasDone;
            if (hasDone) {
                const { hash } = message ? message : { hash: '' };
                const messagesLength = self.messages.length;

                if (messagesLength > 1) {
                    self.messages[messagesLength - 2].hash = hash;
                    self.messages[messagesLength - 1].hash = hash;
                } else if (messagesLength > 0) {
                    self.messages[messagesLength - 1].hash = hash;
                }
            }
        },
        startResponsing: (message: string) => {
            self.responsed = true;
            self.currentMessage = message;
        },
        newMessage: (message: IMessage) => {
            self.messages.push(message);
        },
        updateLastMessage: (message: string) => {
            if (self.messages.length > 0) {
                self.messages[self.messages.length - 1].message = message;
            }
        },
        shiftMessage: () => {
            self.messages.splice(0, 1);
        },
        popMessage: () => {
            self.messages.pop();
        },
        clearMessages: () => {
            self.messages.length = 0;
        },
        happendError: (errorMessage: string) => {
            self.errorMessage = errorMessage;
        },
        onMessagesTop: () => {
            self.isTop = true;
            self.isBottom = false;
        },
        onMessagesBottom: () => {
            self.isTop = false;
            self.isBottom = true;
        },
        onMessagesMiddle: () => {
            self.isTop = false;
            self.isBottom = false;
        },
        fetchHistoryMessages: flow(function* (params: { pageIndex: number }) {
            const { pageIndex, entries } = yield fetchHistoryMessages(params);
            if (entries.length > 0) {
                self.pageIndex = pageIndex;
                const messages = entries
                    .map((entry, index) => {
                        const { hash, user, date, request, response, context } = entry;
                        const chatContexts = context?.map(({ content }) => {
                            return JSON.parse(content);
                        });
                        return [
                            { type: 'user', message: request, contexts: chatContexts, date: date, hash: hash },
                            { type: 'bot', message: response, date: date, hash: hash },
                        ];
                    })
                    .flat();
                if (self.pageIndex === 0) {
                    self.messages.push(...messages);
                } else if (self.pageIndex > 0) {
                    self.messages.concat(...messages);
                }
            } else {
                self.isLastPage = true;
            }
        }),
        deleteMessage: flow(function* (item: IMessage) {
            const { hash } = yield deleteMessage(item);
            const index = self.messages.findIndex((item: any) => item.hash === hash);
            if (index > -1) {
                self.messages.splice(index);
            }
        })
    }));


export type IMessage = Instance<typeof Message>;