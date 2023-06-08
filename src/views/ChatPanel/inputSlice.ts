import { createSlice } from '@reduxjs/toolkit';

export const inputSlice = createSlice({
    name: 'input',
    initialState: {
        value: '',
        contexts: <any>[]
    },
    reducers: {
        setValue: (state, action) => {
            state.value = action.payload;
        },
        removeContext: (state, action) => {
            state.contexts.splice(action.payload, 1);
        },
        clearContexts: (state) => {
            state.contexts.length = 0;
        },
        setContexts: (state, action) => {
            state.contexts = action.payload;
        },
        newContext: (state, action) => {
            state.contexts.push(action.payload);
        },
    }
});

export const selectValue = state => state.input.value;
export const selectContexts = state => state.input.contexts;

export const {
    setValue,
    removeContext,
    clearContexts,
    setContexts,
    newContext,
} = inputSlice.actions;

export default inputSlice.reducer;