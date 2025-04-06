// TauriViteReact/src/app/store.js

import { configureStore } from '@reduxjs/toolkit';
import systemDataReducer from '../features/systemData/systemDataSlice';
import uiReducer from '../features/ui/uiSlice';
import errorReducer from '../features/error/errorSlice';

export const store = configureStore({
  reducer: {
    systemData: systemDataReducer,
    ui: uiReducer,
    error: errorReducer,
  },
  // It's often safer to disable this check when dealing with data from Rust FFI,
  // unless you are certain all data structures (like timestamps) are serializable JSON types.
  middleware: (getDefaultMiddleware) =>
     getDefaultMiddleware({
       serializableCheck: false,
     }),
});