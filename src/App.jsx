import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx'; // Helper library for conditional classes (npm install clsx)

// --- Import Icons ---
import {
  LuLayoutDashboard, LuCpu, LuMemoryStick, LuDisc3, LuServer,
  LuNetwork, LuListTree, LuGithub, LuSun, LuMoon, LuSettings, LuX, LuBell,
  LuActivity
} from "react-icons/lu";
import { BsGpuCard } from "react-icons/bs";

// Redux Actions / Components (Imports remain the same)
import { setLoading, updateSystemData, setDataFetchError } from './features/systemData/systemDataSlice';
import { setCurrentTab, toggleDarkMode } from './features/ui/uiSlice'; // Removed setDarkMode unless needed
import { setBackendError, clearBackendError } from './features/error/errorSlice';
import OverviewTab from './components/OverviewTab'; // Expecting Tailwind refactored version
import CpuTab from './components/CpuTab';
import MemoryTab from './components/MemoryTab';
import GpuTab from './components/GpuTab';
import DiskTab from './components/DiskTab';
import NetworkTab from './components/NetworkTab';
import ProcessesTab from './components/ProcessesTab';
// import SettingsTab from './components/SettingsTab';

// No need to import App.css anymore if using index.css for directives

// --- Tab Configuration ---
const TABS = [
    { name: 'Overview', icon: <LuLayoutDashboard />, component: OverviewTab },
    { name: 'CPU', icon: <LuCpu />, component: CpuTab },
    { name: 'Memory', icon: <LuMemoryStick />, component: MemoryTab },
    { name: 'GPU', icon: <BsGpuCard />, component: GpuTab }, // Using BsGpuCard
    { name: 'Disk', icon: <LuDisc3 />, component: DiskTab },
    { name: 'Network', icon: <LuNetwork />, component: NetworkTab },
    { name: 'Processes', icon: <LuListTree />, component: ProcessesTab },
];

// --- Control Icons ---
const CONTROL_ICONS = {
    Github: <LuGithub />,
    ThemeLight: <LuSun />,
    ThemeDark: <LuMoon />,
    Settings: <LuSettings />,
    DismissError: <LuX />,
    Notification: <LuBell />,
    Activity: <LuActivity />
};

function App() {
  const dispatch = useDispatch();
  const { currentTab, darkMode } = useSelector((state) => state.ui);
  const { status: dataStatus, platform_name, timestamp, error: dataError } = useSelector((state) => state.systemData);
  const backendErrorMessage = useSelector((state) => state.error.backendErrorMessage);

  // --- Theme Management (Using Tailwind 'class' strategy) ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Also apply to body if needed for specific overrides, though root is preferred for Tailwind
    // document.body.className = darkMode ? 'theme-dark' : 'theme-light'; // Keep if base body styles depend on it
  }, [darkMode]);

  // --- Tauri Backend Communication (remains the same) ---
  useEffect(() => {
    let unlistenSystemUpdate = () => {};
    let unlistenBackendError = () => {};
    const setupTauriCommunication = async () => {
      try {
        dispatch(setLoading());
        // Optional: Check system preference for initial theme?
        // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // dispatch(setDarkMode(prefersDark)); // Set initial theme based on preference

        const initialData = await invoke('get_current_system_data');
        dispatch(updateSystemData(initialData));

        unlistenSystemUpdate = await listen('system-update', (event) => {
          console.log('System update event:', event.payload);
          dispatch(updateSystemData(event.payload));
        });
        unlistenBackendError = await listen('backend-error', (event) => {
          const msg = typeof event.payload === 'string' ? event.payload : 'Unknown backend error';
          dispatch(setBackendError(msg));
        });
      } catch (error) {
        const msg = `Tauri setup failed: ${error}`;
        dispatch(setDataFetchError(msg));
        dispatch(setBackendError(msg));
      }
    };
    setupTauriCommunication();
    return () => { unlistenSystemUpdate(); unlistenBackendError(); };
   }, [dispatch]);

  // --- Handlers (remain the same) ---
  const handleTabChange = useCallback((tabName) => dispatch(setCurrentTab(tabName)), [dispatch]);
  const handleThemeToggle = useCallback(() => dispatch(toggleDarkMode()), [dispatch]);
  const dismissBackendError = useCallback(() => dispatch(clearBackendError()), [dispatch]);
  const openGithubLink = useCallback(async () => {
     try { await openUrl('https://github.com/joyo/system-monitor-pro'); } // Updated GitHub URL
     catch (e) { dispatch(setBackendError(`Failed to open link: ${e}`)); }
   }, [dispatch]);
  const handleSettingsClick = useCallback(() => { /* TODO: Implement Settings */ dispatch(setBackendError("Settings panel inaccessible.")); }, [dispatch]);

  // --- Render Tab Content (remains the same logic, ensure components are valid) ---
    const renderTabContent = () => {
      const ActiveComponent = TABS.find(tab => tab.name === currentTab)?.component;

      if (dataStatus === 'loading') {
        return <div className="text-center p-12 text-sci-text-light-secondary dark:text-sci-text-dark-secondary font-mono text-sm">Calibrating Sensors...</div>;
      }
      if (dataStatus === 'failed' && !backendErrorMessage) {
        // Use Tailwind for data error status bar if needed, or rely on the absolute positioned one
         return <div className="p-4 text-center text-red-500">Sensor Anomaly: {dataError || 'Unknown system fault'}</div>;
      }
      // Ensure component is valid before rendering
      if (ActiveComponent && typeof ActiveComponent === 'function' && (dataStatus === 'succeeded' || dataStatus === 'idle')) {
        return <ActiveComponent />;
      }
      // Fallback if component not found or status is wrong
      return (
          <div className="m-4 p-8 rounded-md border border-sci-border-light dark:border-sci-border-dark bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt text-center text-sci-text-light-secondary dark:text-sci-text-dark-secondary italic">
             Awaiting system data stream...
          </div>
      );
    };


  return (
    // Apply theme class to root via useEffect, container gets base styles
    <div className="flex flex-col h-screen overflow-hidden bg-sci-bg-light dark:bg-sci-bg-dark" data-tauri-drag-region>

        {/* --- Minimalist Top/Control Bar --- */}
        <motion.nav
          className={clsx(
            "h-[45px] flex-shrink-0 border-b backdrop-blur-sm",
            "flex items-center justify-between px-2.5 z-50", // Adjusted padding
            "bg-sci-bg-light-alt/80 border-sci-border-light", // Light mode bg/border
            "dark:bg-sci-bg-dark-alt/80 dark:border-sci-border-dark" // Dark mode bg/border
          )}
        >
            {/* Tab Navigation */}
            <div className="flex items-center space-x-1">
                 {TABS.map((tab) => (
                   <div key={tab.name} className="group relative"> {/* Group for tooltip hover */}
                      <button
                          title={tab.name}
                          className={clsx(
                              "p-1.5 rounded text-xl transition-colors duration-200", // Base styling
                              "text-sci-text-light-secondary hover:bg-sci-bg-light hover:text-sci-text-light", // Light hover
                              "dark:text-sci-text-dark-secondary dark:hover:bg-sci-bg-dark-alt dark:hover:text-sci-text-dark", // Dark hover
                              currentTab === tab.name && "text-sci-accent-blue dark:text-sci-accent-blue bg-sci-accent-blue/10 dark:bg-sci-accent-blue/10 shadow-[inset_0_-2px_0_0] shadow-sci-accent-blue" // Active state
                          )}
                          onClick={() => handleTabChange(tab.name)}
                      >
                          {tab.icon}
                      </button>
                      {/* Tooltip */}
                      <span className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-sci-bg-dark-alt px-1.5 py-0.5 text-xs text-sci-text-dark opacity-0 transition-opacity delay-300 pointer-events-none group-hover:opacity-100 dark:bg-sci-bg-tertiary dark:text-sci-text-dark-secondary">
                         {tab.name}
                      </span>
                    </div>
                 ))}
            </div>

             {/* System/App Controls */}
            <div className="flex items-center space-x-1">
                <div className="p-1.5 text-lg text-sci-accent-green animate-pulse cursor-help" title={`Last update: ${timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}`}>
                    {CONTROL_ICONS.Activity}
                </div>
                <button onClick={handleThemeToggle} title="Toggle Theme" className="p-1.5 rounded text-xl text-sci-text-light-secondary hover:bg-sci-bg-light hover:text-sci-text-light dark:text-sci-text-dark-secondary dark:hover:bg-sci-bg-dark-alt dark:hover:text-sci-text-dark">
                    {darkMode ? CONTROL_ICONS.ThemeLight : CONTROL_ICONS.ThemeDark}
                 </button>
                <button onClick={handleSettingsClick} title="Settings" className="p-1.5 rounded text-xl text-sci-text-light-secondary hover:bg-sci-bg-light hover:text-sci-text-light dark:text-sci-text-dark-secondary dark:hover:bg-sci-bg-dark-alt dark:hover:text-sci-text-dark">
                    {CONTROL_ICONS.Settings}
                </button>
                <button onClick={openGithubLink} title="GitHub" className="p-1.5 rounded text-xl text-sci-text-light-secondary hover:bg-sci-bg-light hover:text-sci-text-light dark:text-sci-text-dark-secondary dark:hover:bg-sci-bg-dark-alt dark:hover:text-sci-text-dark">
                    {CONTROL_ICONS.Github}
                </button>
            </div>
        </motion.nav>


        {/* --- Main Content Area --- */}
        <div className="flex-grow relative overflow-hidden flex flex-col">
             {/* Error Bar Display */}
            <AnimatePresence>
                {backendErrorMessage && (
                    <motion.div
                        className={clsx(
                           "absolute top-0 left-4 right-4 z-40 rounded-b-md p-2",
                           "flex items-center gap-2 text-sm shadow-lg",
                           "bg-sci-red text-white", // Error styling default
                           "dark:bg-sci-red dark:text-white" // Explicit dark error
                           // Add light mode error styling if needed:
                           // "light:bg-red-100 light:text-red-700 light:border light:border-red-300"
                        )}
                        initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                        <span className="text-lg">{CONTROL_ICONS.Notification}</span>
                        <span className="flex-grow">{backendErrorMessage}</span>
                        <button onClick={dismissBackendError} title="Dismiss" className="ml-auto p-1 opacity-70 hover:opacity-100">
                            {CONTROL_ICONS.DismissError}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

             {/* Scrollable Wrapper for Tab Content */}
             <div className="flex-grow overflow-y-auto overflow-x-hidden pt-2.5"> {/* Added padding-top */}
                 <AnimatePresence mode="wait">
                     <motion.div
                         key={currentTab}
                         initial={{ opacity: 0, filter: 'blur(5px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(5px)' }}
                         transition={{ duration: 0.4, ease: 'easeInOut' }}
                         className="p-4 md:p-5" // Responsive padding for content area
                     >
                        {renderTabContent()}
                     </motion.div>
                 </AnimatePresence>
             </div>
        </div>
    </div>
  );
}

export default App;