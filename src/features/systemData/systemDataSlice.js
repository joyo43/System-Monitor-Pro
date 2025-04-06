// TauriViteReact/src/features/systemData/systemDataSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cpu_usage: [],
  cpu_history: [],
  memory_used: 0.0,
  memory_total: 1.0, // Initial default to avoid division by zero
  memory_history: [],
  top_processes: [], // Expects Array of [pid_u32, name_string, cpu_f32, mem_mb_u64]
  network_data: {},  // Expects { interface_name: NetworkData, ... }
  gpu_data: [],      // Expects Array of GpuData
  disk_data: {},     // Expects { disk_name: DiskData, ... }
  timestamp: null,   // Expects ISO string or similar from backend
  platform_name: 'Loading...',
  status: 'idle',    // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,       // Stores error messages related to data fetching/processing
};

export const systemDataSlice = createSlice({
  name: 'systemData',
  initialState,
  reducers: {
    setLoading: (state) => {
      state.status = 'loading';
      state.error = null; // Clear previous errors on new load attempt
    },
    // Action dispatched when 'system-update' event is received
    updateSystemData: (state, action) => {
      const newData = action.payload;
      // Replace state fields with new data from backend payload
      state.cpu_usage = newData.cpu_usage;
      state.cpu_history = newData.cpu_history;
      state.memory_used = newData.memory_used;
      state.memory_total = newData.memory_total;
      state.memory_history = newData.memory_history;
      state.top_processes = newData.top_processes;
      state.network_data = newData.network_data;
      state.gpu_data = newData.gpu_data;
      state.disk_data = newData.disk_data;
      state.timestamp = newData.timestamp; // Assumes backend sends a serializable format
      state.platform_name = newData.platform_name;
      state.status = 'succeeded';
      state.error = null; // Clear error on successful update
    },
    // Action dispatched on fetch/command errors or 'backend-error' event
    setDataFetchError: (state, action) => {
        state.status = 'failed';
        state.error = action.payload; // Store the specific error message
    }
  },
});

// Export action creators
export const { setLoading, updateSystemData, setDataFetchError } = systemDataSlice.actions;

// Export the reducer
export default systemDataSlice.reducer;