import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuMemoryStick, LuActivity, LuHardDrive } from "react-icons/lu";
import { BiBarChartAlt } from "react-icons/bi";
import { GrPieChart } from "react-icons/gr";

import { getMemoryColorClass, formatBytes } from '../utils/formatting';
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

function MemoryTab() {
  const { memory_used, memory_total, memory_history } = useSelector((state) => state.systemData);
  
  // Calculate memory usage percentage
  const memoryUsagePercent = memory_total > 0
    ? (memory_used / memory_total) * 100
    : 0;
    
  // Format values for display
  const usedGB = memory_used.toFixed(2);
  const totalGB = memory_total.toFixed(2);
  const freeGB = (memory_total - memory_used).toFixed(2);
  
  // Check if memory_history is an array of numbers (percentage history)
  const isPercentageArray = Array.isArray(memory_history) && 
                          memory_history.length > 0 && 
                          typeof memory_history[0] === 'number';
  
  // Extract historical data for charting
  let memoryPercentHistory = [];
  let timestamps = [];
  
  if (isPercentageArray) {
    // Direct percentage values
    memoryPercentHistory = memory_history;
    
    // Create timestamps array (since we don't have explicit timestamps)
    timestamps = Array.from({ length: memoryPercentHistory.length }, (_, i) => 
      new Date(Date.now() - (memoryPercentHistory.length - i - 1) * 1000).toISOString()
    );
  } else {
    // Original implementation for object-based history
    memoryPercentHistory = memory_history.map(entry => 
      (entry.used_gb / entry.total_gb) * 100
    );
    timestamps = memory_history.map(entry => entry.timestamp);
  }
  
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
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      fill: 'bg-gradient-to-r from-pink-400 to-fuchsia-500'
    };
  };
  
  // Memory color for charts and elements
  const memoryBaseColor = 'rgba(236, 72, 153, 1)'; // pink-500
  const memoryFillColor = 'rgba(236, 72, 153, 0.15)';
  
  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuMemoryStick className="text-pink-500 dark:text-pink-400" />
          Memory Usage
        </h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Memory Overview Panel */}
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
              <BiBarChartAlt className="text-pink-500 dark:text-pink-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                Memory Overview
              </h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                  Memory Usage
                </div>
                <div className={clsx(
                  "text-3xl md:text-4xl font-mono font-medium leading-none",
                  getMemoryColorClass(memoryUsagePercent)
                )}>
                  {memoryUsagePercent.toFixed(1)}%
                </div>
                <div className="mt-1 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                  {usedGB} GB used of {totalGB} GB
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:text-right">
                <div>
                  <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                    Used
                  </div>
                  <div className="text-lg font-mono font-medium text-pink-600 dark:text-pink-400">
                    {usedGB} GB
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                    Free
                  </div>
                  <div className="text-lg font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {freeGB} GB
                  </div>
                </div>
              </div>
            </div>
            
            {/* Memory Usage Bar */}
            <div className="mb-4">
              <div className={clsx("h-4 w-full rounded-full overflow-hidden", getProgressColors(memoryUsagePercent).bg)}>
                <div 
                  className={clsx(
                    getProgressColors(memoryUsagePercent).fill,
                    "h-full rounded-full transition-all duration-500 ease-in-out"
                  )}
                  style={{ width: `${memoryUsagePercent}%` }}
                ></div>
              </div>
            </div>
            
            {memoryPercentHistory.length > 0 && (
              <div className="mt-5 h-36">
                <HistoricalChart 
                  data={memoryPercentHistory}
                  timestamps={timestamps}
                  label="Memory Usage"
                  yAxisLabel="Usage (%)"
                  color={memoryBaseColor}
                  fillColor={memoryFillColor}
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
        
        {/* Memory Visualization Panel */}
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
              <GrPieChart className="text-pink-500 dark:text-pink-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                Memory Visualization
              </h3>
            </div>
          </div>
          
          <div className="p-4 flex flex-col items-center justify-center">
            {/* Circular progress gauge */}
            <div className="relative w-40 h-40 mb-4">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  className="stroke-gray-200 dark:stroke-gray-700" 
                  strokeWidth="10"
                />
                
                {/* Progress circle with stroke-dasharray animation */}
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  className="stroke-pink-500 dark:stroke-pink-400" 
                  strokeWidth="10"
                  strokeDasharray={`${251.2 * memoryUsagePercent / 100} 251.2`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                {/* Text in the middle */}
                <text 
                  x="50" y="45" 
                  dominantBaseline="middle" 
                  textAnchor="middle"
                  className="fill-sci-text-light dark:fill-sci-text-dark text-2xl font-bold font-mono"
                >
                  {memoryUsagePercent.toFixed(1)}%
                </text>
                <text 
                  x="50" y="60" 
                  dominantBaseline="middle" 
                  textAnchor="middle"
                  className="fill-sci-text-light-secondary dark:fill-sci-text-dark-secondary text-sm"
                >
                  Used
                </text>
              </svg>
            </div>
            
            {/* Memory blocks visualization */}
            <div className="w-full mt-2">
              <div className="grid grid-cols-10 gap-1 mb-4">
                {Array.from({ length: 10 }).map((_, index) => {
                  const threshold = (memoryUsagePercent / 10);
                  const isUsed = index < threshold;
                  return (
                    <div 
                      key={index} 
                      className={clsx(
                        "h-6 rounded",
                        isUsed 
                          ? "bg-gradient-to-r from-pink-400 to-fuchsia-500" 
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  );
                })}
              </div>
              
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded"></div>
                  <span className="text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                    Used: {usedGB} GB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <span className="text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                    Free: {freeGB} GB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Memory Details Panel */}
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
            <LuHardDrive className="text-pink-500 dark:text-pink-400" />
            <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
              Memory Details
            </h3>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className={clsx(
              "p-4 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Total Memory
              </div>
              <div className="text-2xl font-mono font-medium text-sci-text-light dark:text-sci-text-dark">
                {totalGB} GB
              </div>
            </div>
            
            <div className={clsx(
              "p-4 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Used Memory
              </div>
              <div className="text-2xl font-mono font-medium text-pink-600 dark:text-pink-400">
                {usedGB} GB
              </div>
            </div>
            
            <div className={clsx(
              "p-4 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Free Memory
              </div>
              <div className="text-2xl font-mono font-medium text-emerald-600 dark:text-emerald-400">
                {freeGB} GB
              </div>
            </div>
          </div>
          
          {/* Memory Usage History */}
          {!isPercentageArray && (
            <div className="mt-4 h-64">
              <div className="text-sm font-medium mb-2 text-sci-text-light dark:text-sci-text-dark">
                Memory Usage (GB)
              </div>
              <HistoricalChart 
                data={memory_history.map(entry => entry.used_gb)}
                timestamps={timestamps}
                label="Used Memory"
                yAxisLabel="GB"
                color="rgba(236, 72, 153, 1)" // pink-500
                fillColor="rgba(236, 72, 153, 0.15)"
                valueFormatter={(val) => `${val.toFixed(2)} GB`}
                minY={0}
                maxY={Math.max(...memory_history.map(entry => entry.total_gb)) * 1.1}
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
    </div>
  );
}

export default MemoryTab;