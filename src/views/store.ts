import { configureStore } from '@reduxjs/toolkit';
import inputReducer from './ChatPanel/inputSlice';
import chatReducer from './ChatPanel/chatSlice';

export const store = configureStore({
  reducer: {
    input: inputReducer,
    chat: chatReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;