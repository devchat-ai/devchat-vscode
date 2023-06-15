import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import messageUtil from '@/util/MessageUtil';
import type { RootState } from '@/views/store';

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

export const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        generating: false,
        responsed: false,
        currentMessage: '',
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
            state.errorMessage = '';
            state.currentMessage = '';
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: action.payload
            });
        },
        reGenerating: (state) => {
            state.generating = true;
            state.responsed = false;
            state.errorMessage = '';
            state.currentMessage = '';
            state.messages.pop();
            messageUtil.sendMessage({
                command: 'regeneration'
            });
        },
        stopGenerating: (state) => {
            state.generating = false;
            state.responsed = false;
        },
        startResponsing: (state, action) => {
            state.responsed = true;
            state.currentMessage = action.payload;
        },
        newMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        updateMessage: (state, action) => {
            state.messages[action.payload.index] = action.payload.newMessage;
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
                                { type: 'user', message: request, contexts: contexts },
                                { type: 'bot', message: response },
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
            });
    }
});

export const selectGenerating = (state: RootState) => state.chat.generating;
export const selectResponsed = (state: RootState) => state.chat.responsed;
export const selectCurrentMessage = (state: RootState) => state.chat.currentMessage;
export const selectErrorMessage = (state: RootState) => state.chat.errorMessage;
export const selectMessages = (state: RootState) => state.chat.messages;
export const selectIsBottom = (state: RootState) => state.chat.isBottom;
export const selectIsTop = (state: RootState) => state.chat.isTop;
export const selectPageIndex = (state: RootState) => state.chat.pageIndex;
export const selectIsLastPage = (state: RootState) => state.chat.isLastPage;


export const {
    startGenerating,
    stopGenerating,
    reGenerating,
    startResponsing,
    happendError,
    newMessage,
    shiftMessage,
    popMessage,
    clearMessages,
    updateMessage,
    onMessagesTop,
    onMessagesBottom,
    onMessagesMiddle,
} = chatSlice.actions;

export default chatSlice.reducer;