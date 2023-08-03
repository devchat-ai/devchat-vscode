import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import messageUtil from '@/util/MessageUtil';
import type { RootState } from '@/views/reducers/store';

export const fetchHistoryMessages = createAsyncThunk<{ pageIndex: number, entries: [] }, { pageIndex: number }>('input/fetchHistoryMessages', async (params) => {
    const { pageIndex } = params;
    return new Promise((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'historyMessages', page: pageIndex });
            messageUtil.registerHandler('loadHistoryMessages', (message: any) => {
                resolve({
                    pageIndex: pageIndex,
                    entries: message.entries
                });
            });
        } catch (e) {
            reject(e);
        }
    });
});

export const deleteMessage = createAsyncThunk<{ hash }, { hash }>('chat/deleteMessage', async (params) => {
    const { hash } = params;
    return new Promise((resolve, reject) => {
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
});

export const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        generating: false,
        responsed: false,
        lastMessage: <any>null,
        currentMessage: '',
        hasDone: false,
        errorMessage: '',
        messages: <any>[],
        pageIndex: 0,
        isLastPage: false,
        isBottom: true,
        isTop: false,
    },
    reducers: {
        startGenerating: (state, action) => {
            state.generating = true;
            state.responsed = false;
            state.hasDone = false;
            state.errorMessage = '';
            state.currentMessage = '';
            let lastNonEmptyHash;
            for (let i = state.messages.length - 1; i >= 0; i--) {
                if (state.messages[i].hash) {
                    lastNonEmptyHash = state.messages[i].hash;
                    break;
                }
            }
            const { text, contextInfo } = action.payload;
            messageUtil.sendMessage({
                command: 'sendMessage',
                text,
                contextInfo,
                parent_hash: lastNonEmptyHash === 'message' ? null : lastNonEmptyHash
            });
        },
        startSystemMessage: (state, action) => {
            state.generating = true;
            state.responsed = false;
            state.hasDone = false;
            state.errorMessage = '';
            state.currentMessage = '';
        },
        reGenerating: (state) => {
            state.generating = true;
            state.responsed = false;
            state.hasDone = false;
            state.errorMessage = '';
            state.currentMessage = '';
            state.messages.pop();
            messageUtil.sendMessage({
                command: 'regeneration'
            });
        },
        stopGenerating: (state, action) => {
            state.generating = false;
            state.responsed = false;
            state.hasDone = action.payload.hasDone;
            if (action.payload.hasDone) {
                const { hash } = action.payload.message;
                const messagesLength = state.messages.length;

                if (messagesLength > 1) {
                    state.messages[messagesLength - 2].hash = hash;
                    state.messages[messagesLength - 1].hash = hash;
                } else if (messagesLength > 0) {
                    state.messages[messagesLength - 1].hash = hash;
                }
            }
        },
        startResponsing: (state, action) => {
            state.responsed = true;
            state.currentMessage = action.payload;
        },
        newMessage: (state, action) => {
            state.messages.push(action.payload);
            state.lastMessage = action.payload;
        },
        updateLastMessage: (state, action) => {
            state.messages[state.messages.length - 1] = action.payload;
            state.lastMessage = action.payload;
        },
        shiftMessage: (state) => {
            state.messages.splice(0, 1);
        },
        popMessage: (state) => {
            state.messages.pop();
        },
        clearMessages: (state) => {
            state.messages.length = 0;
        },
        happendError: (state, action) => {
            state.errorMessage = action.payload;
        },
        onMessagesTop: (state) => {
            state.isTop = true;
            state.isBottom = false;
        },
        onMessagesBottom: (state) => {
            state.isTop = false;
            state.isBottom = true;
        },
        onMessagesMiddle: (state) => {
            state.isTop = false;
            state.isBottom = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHistoryMessages.fulfilled, (state, action) => {
                const { pageIndex, entries } = action.payload;
                if (entries.length > 0) {
                    state.pageIndex = pageIndex;
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
                    if (state.pageIndex === 0) {
                        state.messages = messages;
                    } else if (state.pageIndex > 0) {
                        state.messages = messages.concat(state.messages);
                    }
                } else {
                    state.isLastPage = true;
                }
            })
            .addCase(deleteMessage.fulfilled, (state, action) => {
                const { hash } = action.payload;
                const index = state.messages.findIndex((item: any) => item.hash === hash);
                if (index > -1) {
                    state.messages.splice(index);
                }
            });
    }
});

export const selectGenerating = (state: RootState) => state.chat.generating;
export const selectResponsed = (state: RootState) => state.chat.responsed;
export const selecHasDone = (state: RootState) => state.chat.hasDone;
export const selecLastMessage = (state: RootState) => state.chat.lastMessage;
export const selectCurrentMessage = (state: RootState) => state.chat.currentMessage;
export const selectErrorMessage = (state: RootState) => state.chat.errorMessage;
export const selectMessages = (state: RootState) => state.chat.messages;
export const selectIsBottom = (state: RootState) => state.chat.isBottom;
export const selectIsTop = (state: RootState) => state.chat.isTop;
export const selectPageIndex = (state: RootState) => state.chat.pageIndex;
export const selectIsLastPage = (state: RootState) => state.chat.isLastPage;


export const {
    startGenerating,
    startSystemMessage,
    stopGenerating,
    reGenerating,
    startResponsing,
    happendError,
    newMessage,
    shiftMessage,
    popMessage,
    clearMessages,
    updateLastMessage,
    onMessagesTop,
    onMessagesBottom,
    onMessagesMiddle,
} = chatSlice.actions;

export default chatSlice.reducer;