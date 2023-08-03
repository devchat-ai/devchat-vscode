import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/views/reducers/store';
import messageUtil from '@/util/MessageUtil';

export const fetchContextMenus = createAsyncThunk('input/fetchContextMenus', async () => {
    return new Promise((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'regContextList' });
            messageUtil.registerHandler('regContextList', (message: any) => {
                resolve(message.result);
            });
        } catch (e) {
            reject(e);
        }
    });
});

export const fetchCommandMenus = createAsyncThunk('input/fetchCommandMenus', async () => {
    return new Promise((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'regCommandList' });
            messageUtil.registerHandler('regCommandList', (message: any) => {
                resolve(message.result);
            });
        } catch (e) {
            reject(e);
        }
    });
});

export const inputSlice = createSlice({
    name: 'input',
    initialState: {
        value: '',
        contexts: <any>[],
        menuType: 'contexts',
        menuOpend: false,
        currentMenuIndex: 0,
        commandMenus: <any>[],
        contextMenus: <any>[],
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
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchContextMenus.fulfilled, (state, action) => {
                state.contextMenus = action.payload;
            })
            .addCase(fetchCommandMenus.fulfilled, (state, action) => {
                state.commandMenus = action.payload;
            });
    },
});

export const selectValue = (state: RootState) => state.input.value;
export const selectContexts = (state: RootState) => state.input.contexts;
export const selectMenuOpend = (state: RootState) => state.input.menuOpend;
export const selectMenuType = (state: RootState) => state.input.menuType;
export const selectCurrentMenuIndex = (state: RootState) => state.input.currentMenuIndex;
export const selectContextMenus = (state: RootState) => state.input.contextMenus;
export const selectCommandMenus = (state: RootState) => state.input.commandMenus;

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