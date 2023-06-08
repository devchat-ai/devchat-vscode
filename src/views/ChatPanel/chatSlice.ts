import { createSlice } from '@reduxjs/toolkit';

export const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        generating: false,
        responsed: false,
        currentMessage: '',
        errorMessage: '',
        messages: <any>[],
    },
    reducers: {
        startGenerating: (state) => {
            state.generating = true;
            state.responsed = false;
            state.errorMessage = '';
            state.currentMessage = '';
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
        }
    }
});

export const selectGenerating = state => state.chat.generating;
export const selectResponsed = state => state.chat.responsed;
export const selectCurrentMessage = state => state.chat.currentMessage;
export const selectErrorMessage = state => state.chat.errorMessage;
export const selectMessages = state => state.chat.messages;

export const {
    startGenerating,
    stopGenerating,
    startResponsing,
    happendError,
    newMessage,
    shiftMessage,
    popMessage,
    clearMessages,
    updateMessage,
} = chatSlice.actions;

export default chatSlice.reducer;