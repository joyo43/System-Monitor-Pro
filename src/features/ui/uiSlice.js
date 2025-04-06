// TauriViteReact/src/features/ui/uiSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentTab: 'Overview', // Default tab, matching Tab enum variant name
  darkMode: true,         // Default theme from original app
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentTab: (state, action) => {
      // Payload should be the string name of the tab (e.g., "Cpu", "Memory")
      state.currentTab = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action) => {
        // Explicitly set dark mode state (ensure boolean)
        state.darkMode = !!action.payload;
    }
  },
});

// Export action creators
export const { setCurrentTab, toggleDarkMode, setDarkMode } = uiSlice.actions;

// Export the reducer
export default uiSlice.reducer;