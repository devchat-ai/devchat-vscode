import { types, flow, Instance } from "mobx-state-tree";
import messageUtil from '@/util/MessageUtil';

interface Context {
    content: string;
    role: string;
}

interface Entry {
    hash: string;
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

export const deleteMessage = async (params) => {
    const { hash } = params;
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
    message: types.string,
    date: types.maybe(types.string),
});

export const ChatStore = types.model('Chat', {
    generating: false,
    responsed: false,
    lastMessage: types.maybe(Message),
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
        startGenerating: (text: string) => {
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
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: text,
                // context: contextInfo,
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
        startResponsing: (action) => {
            self.responsed = true;
            self.currentMessage = action.payload;
        },
        newMessage: (action) => {
            self.messages.push(action.payload);
            self.lastMessage = action.payload;
        },
        updateLastMessage: (action) => {
            self.messages[self.messages.length - 1] = action.payload;
            self.lastMessage = action.payload;
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
        fetchHistoryMessages: async function (params: { pageIndex: number }) {
            const { pageIndex, entries } = await fetchHistoryMessages(params);
            if (entries.length > 0) {
                self.pageIndex = pageIndex;
                const messages = entries
                    .map((item: any, index) => {
                        const { hash, user, date, request, response, context } = item;
                        const contexts = context?.map(({ content, role }) => ({ context: JSON.parse(content) }));
                        return [
                            { type: 'user', message: request, contexts: contexts, date: date, hash: hash },
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
        },
        deleteMessage: async function (params: { hash: string }) {
            const { hash } = await deleteMessage(params);
            const index = self.messages.findIndex((item: any) => item.hash === hash);
            if (index > -1) {
                self.messages.splice(index);
            }
        }
    }));