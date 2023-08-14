import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import messageUtil from '@/util/MessageUtil';
import type { RootState } from '@/views/reducers/store';

export const fetchHistoryMessages = createAsyncThunk<{ startIndex: number, total: number, entries: [] }, { length: number, startIndex: number }>('input/fetchHistoryMessages', async (params) => {
    const { length, startIndex } = params;
    return new Promise((resolve, reject) => {
        try {
            if (startIndex === 100100100100) {
                messageUtil.sendMessage({ command: 'historyMessages', length: length / 2 });
            } else {
                messageUtil.sendMessage({ command: 'historyMessages', startIndex: startIndex / 2, length: length / 2 });
            }
            messageUtil.registerHandler('loadHistoryMessages', (message: any) => {
                resolve({
                    startIndex: startIndex,
                    total: message.total,
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
        totalCount: 100100100100,
        pageSize: 40,
        nextFirstItemIndex: <number>100100100080,
        isLastPage: false,
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
            state.totalCount++;
        },
        updateLastMessage: (state, action) => {
            state.messages[state.messages.length - 1] = action.payload;
            state.lastMessage = action.payload;
        },
        shiftMessage: (state) => {
            state.messages.splice(0, 1);
            state.totalCount--;
        },
        popMessage: (state) => {
            state.messages.pop();
            state.totalCount--;
        },
        clearMessages: (state) => {
            state.messages.length = 0;
            state.totalCount = 0;
        },
        happendError: (state, action) => {
            state.errorMessage = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHistoryMessages.fulfilled, (state, action) => {
                const { startIndex, total, entries } = action.payload;
                const { pageSize } = state;
                state.totalCount = total * 2;
                const currentStarIndex = startIndex === 100100100100 ? state.totalCount - state.pageSize : startIndex;
                state.nextFirstItemIndex = currentStarIndex >= pageSize ? currentStarIndex - pageSize : 0;
                // console.log('total count = %s,currentStarIndex = %s, nextFirstItemIndex = %s', state.totalCount, currentStarIndex, state.nextFirstItemIndex);

                if (entries.length > 0) {
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
                    if (startIndex === 100100100100) {
                        state.messages = messages;
                    } else {
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
                    state.totalCount = state.totalCount - 2;
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
export const selectTotalCount = (state: RootState) => state.chat.totalCount;
export const selectNextFirstItemIndex = (state: RootState) => state.chat.nextFirstItemIndex;
export const selectPageSize = (state: RootState) => state.chat.pageSize;
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
} = chatSlice.actions;

export default chatSlice.reducer;