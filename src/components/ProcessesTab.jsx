import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuList, LuCpu, LuActivity, LuSearch, LuRefreshCw, LuX, LuTriangleAlert, LuFilter, LuArrowUp, LuArrowDown, LuMemoryStick, LuCommand, LuInfo } from "react-icons/lu";
import { getCpuColorClass, truncateText, formatPercent } from '../utils/formatting';
import HistoricalChart from './HistoricalChart';

// Animation variants for panels
const panelVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05, // Stagger animation
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] // Expo out easing
    }
  })
};

// Row animation variants
const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.01, // Very slight stagger
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

function ProcessesTab() {
  const { top_processes = [], timestamp } = useSelector((state) => state.systemData);
  const [sortBy, setSortBy] = useState('cpu'); // Default sort by CPU usage
  const [sortDirection, setSortDirection] = useState('desc'); // Default descending
  const [searchTerm, setSearchTerm] = useState('');
  const [processHistory, setProcessHistory] = useState({});
  const [timestamps, setTimestamps] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [confirmKillOpen, setConfirmKillOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, process: null });
  const searchInputRef = useRef(null);

  // Store process history for top processes
  useEffect(() => {
    if (top_processes.length > 0 && timestamp) {
      // Update timestamps array
      setTimestamps(prev => {
        const newTimestamps = [...prev, timestamp];
        // Keep only the last 100 timestamps
        return newTimestamps.slice(-100);
      });

      // Update process history
      setProcessHistory(prev => {
        const newHistory = { ...prev };
        
        // Add current data for each process
        top_processes.forEach(([pid, name, cpu, mem]) => {
          const processKey = `${pid}-${name}`;
          
          if (!newHistory[processKey]) {
            newHistory[processKey] = {
              pid,
              name,
              cpu: [cpu],
              memory: [mem || 0]
            };
          } else {
            newHistory[processKey].cpu.push(cpu);
            newHistory[processKey].memory.push(mem || 0);
            
            // Keep only last 100 data points
            if (newHistory[processKey].cpu.length > 100) {
              newHistory[processKey].cpu = newHistory[processKey].cpu.slice(-100);
              newHistory[processKey].memory = newHistory[processKey].memory.slice(-100);
            }
          }
        });
        
        return newHistory;
      });
    }
  }, [top_processes, timestamp]);

  // Close modal and context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (confirmKillOpen && event.target.classList.contains('modal-overlay')) {
        setConfirmKillOpen(false);
      }
      
      // Hide context menu when clicking outside
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, process: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [confirmKillOpen, contextMenu.visible]);

  // Keyboard shortcut for search (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      
      // Close modal with Escape
      if (e.key === 'Escape') {
        if (confirmKillOpen) {
          setConfirmKillOpen(false);
        }
        if (contextMenu.visible) {
          setContextMenu({ visible: false, x: 0, y: 0, process: null });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmKillOpen, contextMenu.visible]);

  // Function to sort processes
  const sortProcesses = (processes) => {
    if (!processes.length) return [];
    
    // Sorting indices: PID = 0, Name = 1, CPU = 2, Memory = 3
    const sortIndex = sortBy === 'name' ? 1 : sortBy === 'pid' ? 0 : sortBy === 'memory' ? 3 : 2;
    
    return [...processes].sort((a, b) => {
      // Special handling for name (string sort)
      if (sortIndex === 1) {
        return sortDirection === 'asc' 
          ? a[sortIndex].localeCompare(b[sortIndex])
          : b[sortIndex].localeCompare(a[sortIndex]);
      }
      // Numeric sort for other columns
      return sortDirection === 'asc' 
        ? a[sortIndex] - b[sortIndex]
        : b[sortIndex] - a[sortIndex];
    });
  };

  // Function to filter processes by search term
  const filterProcesses = (processes) => {
    if (!searchTerm) return processes;
    
    return processes.filter(process => {
      const processName = process[1].toLowerCase();
      const pid = process[0].toString();
      return processName.includes(searchTerm.toLowerCase()) || pid.includes(searchTerm);
    });
  };

  // Handle sort header click
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set to descending by default (except for name)
      setSortBy(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search clear
  const clearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle process click - select or deselect
  const handleProcessClick = (process) => {
    if (selectedProcess && selectedProcess[0] === process[0]) {
      setSelectedProcess(null); // Deselect if clicking the same process
    } else {
      setSelectedProcess(process); // Select the clicked process
    }
  };

  // Handle right click on process row
  const handleContextMenu = (e, process) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      process
    });
  };

  // Handle kill process
  const handleKillProcess = () => {
    // Close the context menu
    setContextMenu({ visible: false, x: 0, y: 0, process: null });
    
    // Display a simple alert message instead of using the modal
    alert("Process termination is yet to be implemented");
  };

  // Process and sort data for display
  const processesToDisplay = filterProcesses(sortProcesses(top_processes));
  
  // Get the top 5 processes for historical display based on current sort
  const topProcessesForHistory = processesToDisplay.slice(0, 5);
  
  // Get color for progress bar based on usage
  const getProgressColors = (usagePercent) => {
    if (usagePercent >= 90) {
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        fill: 'bg-gradient-to-r from-red-500 to-red-600'
      };
    }
    if (usagePercent >= 75) {
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        fill: 'bg-gradient-to-r from-amber-500 to-orange-500'
      };
    }
    if (usagePercent >= 50) {
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        fill: 'bg-gradient-to-r from-yellow-400 to-yellow-500'
      };
    }
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      fill: 'bg-gradient-to-r from-blue-400 to-purple-500'
    };
  };
  
  // For rendering the sort indicator
  const renderSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? (
          <LuArrowUp className="inline-block w-3 h-3" />
        ) : (
          <LuArrowDown className="inline-block w-3 h-3" />
        )}
      </span>
    );
  };
  
  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuList className="text-purple-500 dark:text-purple-400" />
          Process Management
        </h2>
      </div>
      
      {/* Search & Controls */}
      <motion.div 
        className={clsx(
          "overflow-hidden rounded-md",
          "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
          "border border-sci-border-light dark:border-sci-border-dark",
          "shadow-sci-light dark:shadow-sci-dark"
        )}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
          <div className="flex items-center gap-2">
            <LuSearch className="text-purple-500 dark:text-purple-400" />
            <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
              Search & Controls
            </h3>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LuSearch className="h-4 w-4 text-sci-text-light-secondary dark:text-sci-text-dark-secondary" />
              </div>
              <input
                type="text"
                placeholder="Search processes by name or PID (Ctrl+F)"
                value={searchTerm}
                onChange={handleSearch}
                ref={searchInputRef}
                className={clsx(
                  "w-full pl-10 pr-10 py-2 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark",
                  "text-sci-text-light dark:text-sci-text-dark",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                )}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <LuX className="h-4 w-4 text-sci-text-light-secondary dark:text-sci-text-dark-secondary hover:text-sci-text-light hover:dark:text-sci-text-dark" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2 self-end md:self-auto">
              <button 
                className={clsx(
                  "p-2 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark",
                  "text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                  "hover:text-purple-600 hover:dark:text-purple-400",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                )}
                title="Refresh process list"
              >
                <LuRefreshCw className="h-5 w-5" />
              </button>
              
              <button 
                className={clsx(
                  "p-2 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark",
                  "text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                  "hover:text-purple-600 hover:dark:text-purple-400",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                )}
                title="Filter options"
              >
                <LuFilter className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={clsx(
              "p-3 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Total Processes
              </div>
              <div className="text-xl font-mono font-medium text-sci-text-light dark:text-sci-text-dark">
                {top_processes.length}
              </div>
            </div>
            
            <div className={clsx(
              "p-3 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Displayed
              </div>
              <div className="text-xl font-mono font-medium text-sci-text-light dark:text-sci-text-dark">
                {processesToDisplay.length}
              </div>
            </div>
            
            {selectedProcess && (
              <div className={clsx(
                "p-3 rounded-md col-span-2",
                "bg-purple-50 dark:bg-purple-900/20",
                "border border-purple-200 dark:border-purple-800"
              )}>
                <div className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-1">
                  Selected Process
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-base font-medium text-purple-700 dark:text-purple-300 truncate pr-2">
                    {selectedProcess[1]} ({selectedProcess[0]})
                  </div>
                  <button
                    className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100"
                    onClick={() => setSelectedProcess(null)}
                  >
                    <LuX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary italic">
            Tip: Right-click on a process to open the context menu for more options.
          </div>
        </div>
      </motion.div>
      
      {top_processes.length === 0 ? (
        <motion.div 
          className={clsx(
            "p-8 text-center rounded-md",
            "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
            "border border-sci-border-light dark:border-sci-border-dark",
            "shadow-sci-light dark:shadow-sci-dark"
          )}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <LuInfo className="mx-auto h-10 w-10 text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-30 mb-3" />
          <p className="text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            No process data available.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Process Table */}
          <motion.div 
            className={clsx(
              "overflow-hidden rounded-md",
              "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
              "border border-sci-border-light dark:border-sci-border-dark",
              "shadow-sci-light dark:shadow-sci-dark"
            )}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
              <div className="flex items-center gap-2">
                <LuCommand className="text-purple-500 dark:text-purple-400" />
                <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                  Process List
                </h3>
              </div>
            </div>
            
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sci-border-light dark:border-sci-border-dark">
                    <th 
                      className={clsx(
                        "p-4 text-left whitespace-nowrap cursor-pointer",
                        "text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                        "font-medium"
                      )}
                      onClick={() => handleSort('pid')}
                    >
                      <div className="flex items-center">
                        <span>PID</span>
                        {renderSortIndicator('pid')}
                      </div>
                    </th>
                    <th 
                      className={clsx(
                        "p-4 text-left whitespace-nowrap cursor-pointer",
                        "text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                        "font-medium"
                      )}
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        <span>Process Name</span>
                        {renderSortIndicator('name')}
                      </div>
                    </th>
                    <th 
                      className={clsx(
                        "p-4 text-left whitespace-nowrap cursor-pointer",
                        "text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                        "font-medium"
                      )}
                      onClick={() => handleSort('cpu')}
                    >
                      <div className="flex items-center">
                        <span>CPU</span>
                        {renderSortIndicator('cpu')}
                      </div>
                    </th>
                    <th 
                      className={clsx(
                        "p-4 text-left whitespace-nowrap cursor-pointer",
                        "text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary",
                        "font-medium"
                      )}
                      onClick={() => handleSort('memory')}
                    >
                      <div className="flex items-center">
                        <span>Memory</span>
                        {renderSortIndicator('memory')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {processesToDisplay.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                        No matching processes found
                      </td>
                    </tr>
                  ) : (
                    processesToDisplay.map(([pid, name, cpu, mem], index) => {
                      const isSelected = selectedProcess && selectedProcess[0] === pid;
                      const colors = getProgressColors(cpu);
                      
                      return (
                        <motion.tr 
                          key={pid}
                          className={clsx(
                            "border-b border-sci-border-light dark:border-sci-border-dark",
                            "hover:bg-sci-bg-light hover:dark:bg-sci-bg-dark cursor-pointer",
                            isSelected && "bg-purple-50 dark:bg-purple-900/20"
                          )}
                          onClick={() => handleProcessClick([pid, name, cpu, mem])}
                          onContextMenu={(e) => handleContextMenu(e, [pid, name, cpu, mem])}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          custom={index}
                        >
                          <td className="p-3 text-sm font-mono text-sci-text-light dark:text-sci-text-dark">
                            {pid}
                          </td>
                          <td className="p-3 text-sm text-sci-text-light dark:text-sci-text-dark">
                            <div className="truncate max-w-xs" title={name}>
                              {name}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <div 
                                  className={clsx(
                                    colors.fill,
                                    "h-full rounded-full transition-all duration-300"
                                  )}
                                  style={{ width: `${Math.min(cpu, 100)}%` }}
                                ></div>
                              </div>
                              <span className={getCpuColorClass(cpu)}>
                                {formatPercent(cpu)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm font-mono text-sci-text-light dark:text-sci-text-dark">
                            {mem || 0} MB
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          
          {/* Top Processes History - Moved to the end as requested */}
          {topProcessesForHistory.length > 0 && topProcessesForHistory.some(([pid, name]) => {
            const processKey = `${pid}-${name}`;
            const processData = processHistory[processKey];
            return processData && processData.cpu.length >= 2;
          }) && (
            <motion.div 
              className={clsx(
                "overflow-hidden rounded-md",
                "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
                "border border-sci-border-light dark:border-sci-border-dark",
                "shadow-sci-light dark:shadow-sci-dark"
              )}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LuActivity className="text-purple-500 dark:text-purple-400" />
                    <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                      Process History
                    </h3>
                  </div>
                  <span className="text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                    Last {timestamps.length} samples
                  </span>
                </div>
              </div>
              
              <div className="p-4 space-y-5">
                {topProcessesForHistory.map(([pid, name, cpu, mem]) => {
                  const processKey = `${pid}-${name}`;
                  const processData = processHistory[processKey];
                  
                  if (!processData || processData.cpu.length < 2) {
                    return null;
                  }
                  
                  return (
                    <div key={processKey} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-sci-text-light dark:text-sci-text-dark">
                          {truncateText(name, 30)} 
                        </span>
                        <span className="text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                          (PID: {pid})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <LuCpu className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                              CPU Usage
                            </div>
                          </div>
                          <div className="h-24">
                            <HistoricalChart 
                              data={processData.cpu}
                              timestamps={timestamps.slice(-processData.cpu.length)}
                              label="CPU Usage"
                              yAxisLabel="CPU (%)"
                              color="rgba(83, 156, 245, 1)"
                              fillColor="rgba(83, 156, 245, 0.1)"
                              valueFormatter={(val) => `${val.toFixed(1)}%`}
                              options={{
                                scales: {
                                  y: {
                                    grid: {
                                      display: false
                                    }
                                  },
                                  x: {
                                    grid: {
                                      display: false
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <LuMemoryStick className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                            <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                              Memory Usage
                            </div>
                          </div>
                          <div className="h-24">
                            <HistoricalChart 
                              data={processData.memory}
                              timestamps={timestamps.slice(-processData.memory.length)}
                              label="Memory"
                              yAxisLabel="MB"
                              color="rgba(118, 74, 188, 1)"
                              fillColor="rgba(118, 74, 188, 0.1)"
                              valueFormatter={(val) => `${val.toFixed(0)} MB`}
                              minY={0}
                              options={{
                                scales: {
                                  y: {
                                    grid: {
                                      display: false
                                    }
                                  },
                                  x: {
                                    grid: {
                                      display: false
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className={clsx(
            "fixed z-50 shadow-lg",
            "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
            "border border-sci-border-light dark:border-sci-border-dark",
            "text-sci-text-light dark:text-sci-text-dark",
            "rounded overflow-hidden py-1",
            "animate-in fade-in duration-200"
          )}
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
          }}
        >
          <div className={clsx(
            "px-3 py-2 border-b",
            "border-sci-border-light dark:border-sci-border-dark",
            "text-sm font-semibold"
          )}>
            PID: {contextMenu.process?.[0]} - {truncateText(contextMenu.process?.[1] || '', 20)}
          </div>
          <button
            className={clsx(
              "w-full px-4 py-2 text-left text-sm",
              "flex items-center gap-2",
              "hover:bg-sci-bg-light hover:dark:bg-sci-bg-dark"
            )}
            onClick={handleKillProcess}
          >
            <LuX className="h-4 w-4 text-red-500" />
            <span>Terminate Process</span>
          </button>
        </div>
      )}
      
      {/* Coming Soon Modal - Replaces the Kill Process Confirmation */}
      {confirmKillOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-overlay">
          <motion.div 
            className={clsx(
              "w-full max-w-md rounded-lg overflow-hidden",
              "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
              "border border-sci-border-light dark:border-sci-border-dark",
              "shadow-lg"
            )}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="p-4 bg-purple-500 text-white flex items-center gap-3">
              <LuInfo className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Process Termination</h3>
            </div>
            
            <div className="p-5">
              <div className="flex flex-col items-center justify-center">
                <div className="text-xl font-medium text-purple-600 dark:text-purple-400 mb-3">
                  Coming Soon!
                </div>
                <p className="text-center text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-5">
                  The process termination feature is currently under development and will be available in a future update.
                </p>
              </div>
              
              <div className="flex justify-center">
                <button
                  className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600"
                  onClick={() => setConfirmKillOpen(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ProcessesTab;