import { configureStore } from '@reduxjs/toolkit';
import inputReducer from './ChatPanel/inputSlice';
import chatReducer from './ChatPanel/chatSlice';

export default configureStore({
  reducer: {
    input: inputReducer,
    chat: chatReducer
  }
});