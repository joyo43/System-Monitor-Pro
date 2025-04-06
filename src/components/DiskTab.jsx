import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuDisc3, LuActivity, LuHardDrive, LuServer, LuFolder, LuArchive, LuFilter } from "react-icons/lu";
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

function DiskTab() {
  const { disk_data } = useSelector((state) => state.systemData);
  const disks = Object.entries(disk_data || {});
  
  // Create timestamps array for history visualizations
  const timestamps = Array.from({ length: 100 }, (_, i) => 
    new Date(Date.now() - (100 - i - 1) * 1000).toISOString()
  );
  
  // Helper function to validate numeric values
  const isValidNumber = (value) => {
    return value !== undefined && value !== null && !isNaN(value) && typeof value === 'number' && value >= 0;
  };
  
  // Helper function to safely format byte values with proper GB to MB conversion for small values
  const safeFormatBytes = (bytes, suffix = '') => {
    if (!isValidNumber(bytes)) {
      return 'N/A';
    }
    
    // Convert GB to bytes for the formatBytes function if values look too small
    // System data is likely in GB, but formatBytes expects bytes
    if (bytes < 1 && bytes > 0) {
      // Convert GB to bytes (1 GB = 1,073,741,824 bytes)
      const bytesValue = bytes * 1073741824;
      return formatBytes(bytesValue) + (suffix ? ' ' + suffix : '');
    }
    
    return formatBytes(bytes) + (suffix ? ' ' + suffix : '');
  };
  
  // Helper function to safely format byte rates
  const safeFormatBytesPerSec = (bytesPerSec) => {
    if (!isValidNumber(bytesPerSec)) {
      return 'N/A';
    }
    // Multiply by 1024 to convert KB/s to bytes/s for formatBytes function
    return formatBytes(bytesPerSec * 1024) + '/s';
  };
  
  // Helper function to filter invalid data points from history arrays
  const filterValidData = (dataArray) => {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(val => isValidNumber(val) ? val : 0);
  };
  
  // Get an appropriate icon based on disk type/name
  const getDiskIcon = (diskName, diskType) => {
    if (diskType === 'SSD') return <LuServer className="text-purple-500 dark:text-purple-400" />;
    if (diskType === 'HDD') return <LuHardDrive className="text-blue-500 dark:text-blue-400" />;
    
    // Fallback to name-based detection
    const lowerName = diskName.toLowerCase();
    if (lowerName.includes('ssd')) return <LuServer className="text-purple-500 dark:text-purple-400" />;
    if (lowerName.includes('nvme')) return <LuServer className="text-emerald-500 dark:text-emerald-400" />;
    if (lowerName.includes('external') || lowerName.includes('usb')) return <LuArchive className="text-orange-500 dark:text-orange-400" />;
    
    // Default
    return <LuDisc3 className="text-amber-500 dark:text-amber-400" />;
  };
  
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
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      fill: 'bg-gradient-to-r from-emerald-400 to-green-500'
    };
  };
  
  // Helper for disk list items
  const renderDiskPanel = (name, disk, index) => {
    // Verify that disk data is valid before proceeding
    if (!disk || typeof disk !== 'object') {
      return (
        <motion.div 
          key={name || 'unknown'} 
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
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              <LuFilter className="text-red-500 dark:text-red-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
                {name || 'Unknown Disk'}
              </h3>
            </div>
            <div className="mt-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                Data Error
              </span>
            </div>
          </div>
          <div className="p-4 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            Invalid disk data received
          </div>
        </motion.div>
      );
    }
    
    // Calculate disk space values, handling both direct values and calculated ones
    let totalSpace, availableSpace, usedSpace, usagePercent;
    
    // Parse total space 
    if (isValidNumber(disk.total_space)) {
      totalSpace = disk.total_space;
    } else {
      // Can't proceed without valid total space
      return (
        <motion.div 
          key={name} 
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
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              {getDiskIcon(name, disk.disk_type)}
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
                {name}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                disk.disk_type === 'SSD' 
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
              )}>
                {disk.disk_type || 'Unknown'}
              </span>
              {disk.mount_point && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {disk.mount_point}
                </span>
              )}
            </div>
          </div>
          <div className="p-4 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            Unable to determine disk capacity
          </div>
        </motion.div>
      );
    }
    
    // Determine used and available space based on what data we have
    if (isValidNumber(disk.used_percentage)) {
      // If we have a used percentage, we can calculate used space
      usagePercent = disk.used_percentage;
      usedSpace = (totalSpace * usagePercent) / 100;
      availableSpace = totalSpace - usedSpace;
    } else if (isValidNumber(disk.used_space) && isValidNumber(disk.available_space)) {
      // If we have both used and available space
      usedSpace = disk.used_space;
      availableSpace = disk.available_space;
      usagePercent = (usedSpace / totalSpace) * 100;
    } else if (isValidNumber(disk.used_space)) {
      // If we only have used space
      usedSpace = disk.used_space;
      availableSpace = totalSpace - usedSpace;
      usagePercent = (usedSpace / totalSpace) * 100;
    } else if (isValidNumber(disk.available_space)) {
      // If we only have available space
      availableSpace = disk.available_space;
      usedSpace = totalSpace - availableSpace;
      usagePercent = (usedSpace / totalSpace) * 100;
    } else {
      // Not enough info to determine usage
      return (
        <motion.div 
          key={name} 
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
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              {getDiskIcon(name, disk.disk_type)}
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
                {name}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                disk.disk_type === 'SSD' 
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
              )}>
                {disk.disk_type || 'Unknown'}
              </span>
              {disk.mount_point && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {disk.mount_point}
                </span>
              )}
            </div>
          </div>
          <div className="p-4 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            Unable to determine disk usage
          </div>
        </motion.div>
      );
    }
    
    // Ensure percentage is between 0 and 100
    usagePercent = Math.max(0, Math.min(100, usagePercent));
    
    // Format disk space values
    const totalSpaceFormatted = safeFormatBytes(totalSpace);
    const usedSpaceFormatted = safeFormatBytes(usedSpace);
    const availableSpaceFormatted = safeFormatBytes(availableSpace);
    
    // Get color classes for the progress bar
    const progressColors = getProgressColors(usagePercent);
    
    // Clean and validate history data
    const cleanReadHistory = filterValidData(disk.read_history);
    const cleanWriteHistory = filterValidData(disk.write_history);
    
    // Check if read/write history exists and has valid data
    const hasReadHistory = cleanReadHistory.length > 0;
    const hasWriteHistory = cleanWriteHistory.length > 0;
    
    return (
      <motion.div 
        key={name} 
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
        {/* Disk Header */}
        <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
          <div className="flex items-center gap-2">
            {getDiskIcon(name, disk.disk_type)}
            <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
              {name}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={clsx(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              disk.disk_type === 'SSD' 
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
            )}>
              {disk.disk_type || 'Unknown'}
            </span>
            {disk.mount_point && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                <span className="inline-flex items-center gap-1">
                  <LuFolder className="h-3 w-3" />
                  {disk.mount_point}
                </span>
              </span>
            )}
          </div>
        </div>
        
        {/* Disk Capacity */}
        <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
          <div className="mb-3">
            <div className={clsx("h-4 w-full rounded-full overflow-hidden", progressColors.bg)}>
              <div 
                className={clsx(
                  progressColors.fill,
                  "h-full rounded-full transition-all duration-500 ease-in-out"
                )}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-baseline justify-between">
            <div className="text-sm">
              <span className="font-mono font-medium text-sci-text-light dark:text-sci-text-dark">
                {usagePercent.toFixed(1)}%
              </span>
              <span className="ml-1 text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                used
              </span>
            </div>
            <div className="text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
              {availableSpaceFormatted} free
            </div>
          </div>
          
          <div className="mt-2 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            <span className="font-mono">{usedSpaceFormatted}</span> used of <span className="font-mono">{totalSpaceFormatted}</span>
          </div>
        </div>
        
        {/* Disk I/O Stats */}
        <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
          <h4 className="text-xs uppercase tracking-wider mb-3 text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            Current I/O
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={clsx(
              "p-3 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                  Read
                </div>
              </div>
              <div className="font-mono text-lg font-medium text-blue-600 dark:text-blue-400">
                {safeFormatBytesPerSec(disk.read_bytes_per_sec)}
              </div>
            </div>
            <div className={clsx(
              "p-3 rounded-md",
              "bg-sci-bg-light dark:bg-sci-bg-dark",
              "border border-sci-border-light dark:border-sci-border-dark"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2 w-2 bg-amber-500 dark:bg-amber-400 rounded-full"></div>
                <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                  Write
                </div>
              </div>
              <div className="font-mono text-lg font-medium text-amber-600 dark:text-amber-400">
                {safeFormatBytesPerSec(disk.write_bytes_per_sec)}
              </div>
            </div>
          </div>
        </div>
        
        {/* I/O History Charts */}
        {(hasReadHistory || hasWriteHistory) && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                I/O History
              </h4>
              <span className="text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-70">
                Last {Math.max(
                  hasReadHistory ? cleanReadHistory.length : 0,
                  hasWriteHistory ? cleanWriteHistory.length : 0
                )} samples
              </span>
            </div>
            
            <div className="space-y-4">
              {hasReadHistory && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                      Read Speed
                    </div>
                  </div>
                  <div className="h-32 w-full">
                    <HistoricalChart 
                      data={cleanReadHistory}
                      timestamps={timestamps.slice(-cleanReadHistory.length)}
                      label="Read Speed"
                      yAxisLabel="KB/s"
                      color="rgba(59, 130, 246, 1)" // Tailwind blue-500
                      fillColor="rgba(59, 130, 246, 0.1)"
                      valueFormatter={(val) => {
                        if (!isValidNumber(val)) return 'N/A';
                        return formatBytes(val * 1024) + '/s';
                      }}
                      minY={0}
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
              
              {hasWriteHistory && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 bg-amber-500 dark:bg-amber-400 rounded-full"></div>
                    <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                      Write Speed
                    </div>
                  </div>
                  <div className="h-32 w-full">
                    <HistoricalChart 
                      data={cleanWriteHistory}
                      timestamps={timestamps.slice(-cleanWriteHistory.length)}
                      label="Write Speed"
                      yAxisLabel="KB/s"
                      color="rgba(245, 158, 11, 1)" // Tailwind amber-500
                      fillColor="rgba(245, 158, 11, 0.1)"
                      valueFormatter={(val) => {
                        if (!isValidNumber(val)) return 'N/A';
                        return formatBytes(val * 1024) + '/s';
                      }}
                      minY={0}
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
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuDisc3 className="text-amber-500 dark:text-amber-400" />
          Disk Activity
        </h2>
      </div>
      
      {disks.length === 0 ? (
        <div className={clsx(
          "p-8 text-center rounded-md",
          "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
          "border border-sci-border-light dark:border-sci-border-dark",
          "shadow-sci-light dark:shadow-sci-dark"
        )}>
          <LuDisc3 className="mx-auto h-10 w-10 text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-30" />
          <p className="mt-2 text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            No disk data available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {disks.map(([name, disk], index) => renderDiskPanel(name, disk, index))}
        </div>
      )}
    </div>
  );
}

export default DiskTab;