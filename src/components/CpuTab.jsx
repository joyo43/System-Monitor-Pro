import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuCpu, LuActivity, LuClock } from "react-icons/lu";
import { BiBarChartAlt } from "react-icons/bi";
import { RiLayoutMasonryLine } from "react-icons/ri";
import { getCpuColorClass, formatPercent } from '../utils/formatting';
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

function CpuTab() {
  const { cpu_usage, cpu_history, timestamp } = useSelector((state) => state.systemData);
  
  // Calculate average CPU usage
  const avgCpuUsage = cpu_usage.length > 0
    ? cpu_usage.reduce((sum, value) => sum + value, 0) / cpu_usage.length
    : 0;
  
  // Check if cpu_history is an array of arrays (matches the log data structure)
  const isHistoryArrayOfArrays = Array.isArray(cpu_history) && 
                               cpu_history.length > 0 && 
                               Array.isArray(cpu_history[0]);
  
  // Extract historical data for charting based on data structure
  let historyData = [];
  let coreHistoryData = [];
  
  if (isHistoryArrayOfArrays) {
    // Generate average CPU usage history from all cores
    historyData = cpu_history.length > 0 ? 
      cpu_history[0].map((_, timeIndex) => {
        // Calculate average of all cores at this time point
        const coreValues = cpu_history.map(core => core[timeIndex] || 0);
        return coreValues.reduce((sum, val) => sum + val, 0) / coreValues.length;
      }) : [];
    
    // Store each core's history separately
    coreHistoryData = cpu_history;
  } else {
    // Original implementation for object-based history
    historyData = cpu_history.map(entry => entry.average);
  }
  
  // Create timestamps array (since we don't have explicit timestamps in the array structure)
  // Just use sequential numbers that will be formatted as time labels
  const timestamps = Array.from({ length: historyData.length }, (_, i) => 
    new Date(Date.now() - (historyData.length - i - 1) * 1000).toISOString()
  );
  
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
      fill: 'bg-gradient-to-r from-blue-400 to-cyan-500'
    };
  };

  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuCpu className="text-blue-500 dark:text-blue-400" />
          CPU Performance
        </h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* CPU Overview Panel */}
        <motion.div 
          className={clsx(
            "flex flex-col overflow-hidden rounded-md",
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
              <BiBarChartAlt className="text-blue-500 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                CPU Overview
              </h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                  Average Usage
                </div>
                <div className={clsx(
                  "text-3xl md:text-4xl font-mono font-medium leading-none",
                  getCpuColorClass(avgCpuUsage)
                )}>
                  {avgCpuUsage.toFixed(1)}%
                </div>
              </div>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                <div className="flex items-center gap-1.5 mb-1">
                  <LuClock className="h-3.5 w-3.5" />
                  <span>Cores: {cpu_usage.length}</span>
                </div>
              </div>
            </div>
            
            {/* CPU Usage Bar */}
            <div className="mb-3">
              <div className={clsx("h-4 w-full rounded-full overflow-hidden", getProgressColors(avgCpuUsage).bg)}>
                <div 
                  className={clsx(
                    getProgressColors(avgCpuUsage).fill,
                    "h-full rounded-full transition-all duration-500 ease-in-out"
                  )}
                  style={{ width: `${avgCpuUsage}%` }}
                ></div>
              </div>
            </div>
            
            {historyData.length > 0 && (
              <div className="mt-5 h-36">
                <HistoricalChart 
                  data={historyData}
                  timestamps={timestamps}
                  label="CPU Usage"
                  yAxisLabel="Usage (%)"
                  color="rgba(59, 130, 246, 1)" // blue-500
                  fillColor="rgba(59, 130, 246, 0.1)"
                  valueFormatter={(val) => `${val.toFixed(1)}%`}
                  options={{
                    scales: {
                      y: {
                        grid: {
                          color: 'rgba(107, 114, 128, 0.1)'
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
            )}
          </div>
        </motion.div>
        
        {/* CPU Cores Panel */}
        <motion.div 
          className={clsx(
            "flex flex-col overflow-hidden rounded-md",
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
              <RiLayoutMasonryLine className="text-blue-500 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                CPU Cores
              </h3>
            </div>
          </div>
          
          <div className="p-4 flex-grow overflow-y-auto max-h-[400px]">
            <div className="space-y-3">
              {cpu_usage.map((usage, index) => {
                const coreColors = getProgressColors(usage);
                return (
                  <div key={index} className="py-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                        <span className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                          Core {index}
                        </span>
                      </div>
                      <span className={clsx(
                        "text-xs font-mono font-medium",
                        getCpuColorClass(usage)
                      )}>
                        {usage.toFixed(1)}%
                      </span>
                    </div>
                    <div className={clsx("h-2.5 w-full rounded-full overflow-hidden", coreColors.bg)}>
                      <div 
                        className={clsx(
                          coreColors.fill,
                          "h-full rounded-full transition-all duration-500 ease-in-out"
                        )}
                        style={{ width: `${usage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Individual Core History Charts */}
      {isHistoryArrayOfArrays && coreHistoryData.length > 0 && (
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
            <div className="flex items-center gap-2">
              <LuActivity className="text-blue-500 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                Core Usage History
              </h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {coreHistoryData.map((coreData, coreIndex) => (
                <div key={coreIndex} className={clsx(
                  "p-3 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark"
                )}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                      Core {coreIndex}
                    </div>
                    {coreData.length > 0 && (
                      <div className="ml-auto text-xs font-mono text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                        {coreData[coreData.length - 1]?.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="h-24 w-full">
                    <HistoricalChart 
                      data={coreData}
                      timestamps={timestamps.slice(-coreData.length)}
                      label={`Core ${coreIndex}`}
                      yAxisLabel=""
                      color="rgba(59, 130, 246, 1)" // blue-500
                      fillColor="rgba(59, 130, 246, 0.05)"
                      valueFormatter={(val) => `${val?.toFixed(1) || 0}%`}
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
                        },
                        plugins: {
                          legend: {
                            display: false
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default CpuTab;