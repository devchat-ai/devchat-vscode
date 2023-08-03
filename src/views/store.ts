import { configureStore } from '@reduxjs/toolkit';
import inputReducer from '@/views/reducers/inputSlice';
import chatReducer from '@/views/reducers/chatSlice';

export const store = configureStore({
  reducer: {
    input: inputReducer,
    chat: chatReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;