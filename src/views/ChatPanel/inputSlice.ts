import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export const inputSlice = createSlice({
    name: 'input',
    initialState: {
        value: '',
        contexts: <any>[],
        menuType: 'contexts',
        menuOpend: false,
        currentMenuIndex: 0
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
        openMenu: (state, action) => {
            state.menuOpend = true;
            state.menuType = action.payload;
        },
        closeMenu: (state) => {
            state.menuOpend = false;
            state.menuType = '';
        },
        setCurrentMenuIndex: (state, action) => {
            state.currentMenuIndex = action.payload;
        }
    }
});

export const selectValue = (state: RootState) => state.input.value;
export const selectContexts = (state: RootState) => state.input.contexts;
export const selectMenuOpend = (state: RootState) => state.input.menuOpend;
export const selectMenuType = (state: RootState) => state.input.menuType;
export const selectCurrentMenuIndex = (state: RootState) => state.input.currentMenuIndex;

export const {
    setValue,
    removeContext,
    clearContexts,
    setContexts,
    newContext,
    openMenu,
    closeMenu,
    setCurrentMenuIndex,
} = inputSlice.actions;

export default inputSlice.reducer;