import { configureStore } from '@reduxjs/toolkit';
import inputReducer from './ChatPanel/inputSlice';

export default configureStore({
  reducer: {
    input: inputReducer
  }
});