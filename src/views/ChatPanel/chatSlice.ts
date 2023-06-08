import { createSlice } from '@reduxjs/toolkit';

export const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        generating: false,
        responsed: false,
        currentMessage: '',
        errorMessage: '',
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
        happendError: (state, action) => {
            state.errorMessage = action.payload;
        }
    }
});

export const selectGenerating = state => state.chat.generating;
export const selectResponsed = state => state.chat.responsed;
export const selectCurrentMessage = state => state.chat.currentMessage;
export const selectErrorMessage = state => state.chat.errorMessage;

export const {
    startGenerating,
    stopGenerating,
    startResponsing,
    happendError,
} = chatSlice.actions;

export default chatSlice.reducer;