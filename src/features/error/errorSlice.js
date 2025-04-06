// TauriViteReact/src/features/error/errorSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // For general backend errors (e.g., from 'backend-error' event)
  backendErrorMessage: null,
};

export const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    // Action dispatched when 'backend-error' event is received
    setBackendError: (state, action) => {
      state.backendErrorMessage = action.payload; // Expects the error string
    },
    clearBackendError: (state) => {
      state.backendErrorMessage = null;
    },
  },
});

// Export action creators
export const { setBackendError, clearBackendError } = errorSlice.actions;

// Export the reducer
export default errorSlice.reducer;