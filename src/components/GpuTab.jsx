import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { BsGpuCard } from "react-icons/bs";
import { LuActivity, LuThermometer, LuZap, LuDatabase, LuChartLine, LuCpu } from "react-icons/lu";
import { getCpuColorClass, getTemperatureColorClass } from '../utils/formatting';
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

function GpuTab() {
  const { gpu_data } = useSelector((state) => state.systemData);

  // Check if we have GPU data
  const hasGpuData = Array.isArray(gpu_data) && gpu_data.length > 0;

  // Create timestamps array (since we don't have explicit timestamps)
  const timestamps = Array.from({ length: 100 }, (_, i) => 
    new Date(Date.now() - (100 - i - 1) * 1000).toISOString()
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
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      fill: 'bg-gradient-to-r from-teal-400 to-cyan-500'
    };
  };
  
  // Get color for temperature bar
  const getTempColors = (temp) => {
    if (temp >= 85) {
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        fill: 'bg-gradient-to-r from-red-500 to-red-600'
      };
    }
    if (temp >= 75) {
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        fill: 'bg-gradient-to-r from-orange-500 to-amber-500'
      };
    }
    if (temp >= 60) {
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        fill: 'bg-gradient-to-r from-yellow-400 to-yellow-500'
      };
    }
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
        fill: 'bg-gradient-to-r from-green-400 to-emerald-500'
    };
  };
  
  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <BsGpuCard className="text-teal-500 dark:text-teal-400" />
          GPU Information
        </h2>
      </div>
      
      {!hasGpuData ? (
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
          custom={0}
        >
          <BsGpuCard className="mx-auto h-10 w-10 text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-30 mb-3" />
          <p className="text-lg font-medium mb-3 text-sci-text-light dark:text-sci-text-dark">No GPU data available</p>
          <div className="max-w-md mx-auto text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            <p className="mb-2">This could be due to:</p>
            <ul className="text-left list-disc pl-8 space-y-1">
              <li>No supported GPU detected on your system</li>
              <li>GPU drivers not properly installed</li>
              <li>Required system permissions not granted</li>
            </ul>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {gpu_data.map((gpu, index) => {
            // Check if this GPU has utilization history data
            const hasUtilizationHistory = gpu.utilization_history && 
                                          Array.isArray(gpu.utilization_history) && 
                                          gpu.utilization_history.length > 0;
            
            // Calculate memory percentage
            const memoryPercent = gpu.memory_total > 0 
              ? (gpu.memory_used / gpu.memory_total) * 100 
              : 0;
              
            // Determine progress colors
            const utilizationColors = getProgressColors(gpu.utilization);
            const memoryColors = getProgressColors(memoryPercent);
            const temperatureColors = getTempColors(gpu.temperature);
            
            return (
              <motion.div
                key={index}
                className={clsx(
                  "flex flex-col overflow-hidden rounded-md",
                  "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
                  "border border-sci-border-light dark:border-sci-border-dark",
                  "shadow-sci-light dark:shadow-sci-dark"
                )}
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                custom={index}
              >
                {/* GPU Header */}
                <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
                  <div className="flex items-center gap-2">
                    <BsGpuCard className="text-teal-500 dark:text-teal-400" />
                    <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
                      {gpu.name}
                    </h3>
                  </div>
                </div>
                
                {/* GPU Stats */}
                <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
                  <div className="space-y-4">
                    {/* GPU Utilization */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <LuCpu className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                          <span className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                            Utilization
                          </span>
                        </div>
                        <span className={clsx(
                          "text-xs font-mono font-medium",
                          getCpuColorClass(gpu.utilization)
                        )}>
                          {gpu.utilization?.toFixed(1)}%
                        </span>
                      </div>
                      <div className={clsx("h-2.5 w-full rounded-full overflow-hidden", utilizationColors.bg)}>
                        <div 
                          className={clsx(
                            utilizationColors.fill,
                            "h-full rounded-full transition-all duration-500 ease-in-out"
                          )}
                          style={{ width: `${gpu.utilization}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Memory Usage */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <LuDatabase className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                          <span className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                            Memory Usage
                          </span>
                        </div>
                        <span className="text-xs font-mono font-medium text-sci-text-light dark:text-sci-text-dark">
                          {gpu.memory_used?.toFixed(1)} / {gpu.memory_total?.toFixed(1)} GB
                        </span>
                      </div>
                      <div className={clsx("h-2.5 w-full rounded-full overflow-hidden", memoryColors.bg)}>
                        <div 
                          className={clsx(
                            memoryColors.fill,
                            "h-full rounded-full transition-all duration-500 ease-in-out"
                          )}
                          style={{ width: `${memoryPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Temperature and Power */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className={clsx(
                        "p-3 rounded-md",
                        "bg-sci-bg-light dark:bg-sci-bg-dark",
                        "border border-sci-border-light dark:border-sci-border-dark"
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <LuThermometer className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
                          <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                            Temperature
                          </div>
                        </div>
                        <div className={clsx(
                          "font-mono text-lg font-medium",
                          getTemperatureColorClass(gpu.temperature)
                        )}>
                          {gpu.temperature?.toFixed(1)}°C
                        </div>
                        <div className={clsx("h-1 w-full rounded-full overflow-hidden mt-1", temperatureColors.bg)}>
                          <div 
                            className={clsx(
                              temperatureColors.fill,
                              "h-full rounded-full transition-all duration-500 ease-in-out"
                            )}
                            style={{ width: `${Math.min(100, (gpu.temperature / 100) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className={clsx(
                        "p-3 rounded-md",
                        "bg-sci-bg-light dark:bg-sci-bg-dark",
                        "border border-sci-border-light dark:border-sci-border-dark"
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <LuZap className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
                          <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                            Power Usage
                          </div>
                        </div>
                        <div className="font-mono text-lg font-medium text-sci-text-light dark:text-sci-text-dark">
                          {gpu.power_usage?.toFixed(1)} W
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* GPU History Chart */}
                {hasUtilizationHistory && (
                  <div className="p-4 flex-grow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <LuChartLine className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                        <span className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                          Performance History
                        </span>
                      </div>
                      <span className="text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-70">
                        Last {gpu.utilization_history.length} samples
                      </span>
                    </div>
                    
                    <div className="h-40">
                      <HistoricalChart 
                        data={gpu.utilization_history.filter(val => val !== undefined)}
                        timestamps={timestamps.slice(-gpu.utilization_history.length)}
                        label="GPU Usage"
                        yAxisLabel="Usage (%)"
                        color="rgba(20, 184, 166, 1)" // teal-500
                        fillColor="rgba(20, 184, 166, 0.1)"
                        valueFormatter={(val) => `${val?.toFixed(1) || 0}%`}
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
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Additional Info Panel - Only show with GPU data */}
      {hasGpuData && (
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
          custom={gpu_data.length}
        >
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              <LuActivity className="text-teal-500 dark:text-teal-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                GPU Performance Tips
              </h3>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-sci-text-light dark:text-sci-text-dark">Optimal Performance</h4>
                <ul className="text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary pl-5 list-disc space-y-1">
                  <li>Keep GPU driver software up to date</li>
                  <li>Ensure proper cooling and airflow</li>
                  <li>Monitor temperature during intensive tasks</li>
                  <li>Close unused GPU-intensive applications</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-sci-text-light dark:text-sci-text-dark">Warning Signs</h4>
                <ul className="text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary pl-5 list-disc space-y-1">
                  <li>Temperature consistently above 85°C</li>
                  <li>Sustained 100% utilization at idle</li>
                  <li>Graphical glitches or crashes</li>
                  <li>Unexpected performance drops</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default GpuTab;