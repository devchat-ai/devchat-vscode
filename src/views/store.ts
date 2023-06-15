import { configureStore } from '@reduxjs/toolkit';
import inputReducer from '@/views/inputSlice';
import chatReducer from '@/views/chatSlice';

export const store = configureStore({
  reducer: {
    input: inputReducer,
    chat: chatReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;