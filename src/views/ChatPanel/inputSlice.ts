import { createSlice } from '@reduxjs/toolkit';

export const inputSlice = createSlice({
    name: 'input',
    initialState: {
        value: ''
    },
    reducers: {
        setValue: (state, action) => {
            console.log(action);
            state.value = action.payload;
        }
    }
});

export const selectValue = state => state.input.value;

export const { setValue } = inputSlice.actions;

export default inputSlice.reducer;