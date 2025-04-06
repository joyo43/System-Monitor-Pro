import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuCpu, LuMemoryStick, LuNetwork, LuDisc3, LuActivity, LuThermometer, LuDatabase, LuPower, LuList, LuX } from "react-icons/lu";
import { BsGpuCard } from "react-icons/bs";

import { formatSpeed, formatBytes, getMemoryColorClass, getCpuColorClass } from '../utils/formatting';
import HistoricalChart from './HistoricalChart';

// Animation variants for panels - standardized with other tabs
const panelVariants = {
   hidden: { opacity: 0, scale: 0.95 },
   visible: (i) => ({
     opacity: 1,
     scale: 1,
     transition: {
       delay: i * 0.05, // Stagger animation - matched with other tabs
       duration: 0.4,
       ease: [0.16, 1, 0.3, 1] // Expo out easing
     }
   })
};

// Helper: Mini chart component for integration (with dynamic scaling)
const MiniChartWidget = ({ data, label, color, fillColor, unit, timestamps }) => {
    let calculatedMin, calculatedMax;
    const recentData = data?.slice(-50) || []; // Look at last 50 points
    const validDataPoints = recentData.filter(v => v !== null && !isNaN(v));

    if (validDataPoints.length >= 2) {
        const dataMin = Math.min(...validDataPoints);
        const dataMax = Math.max(...validDataPoints);
        // Ensure range is at least 1 (or smaller like 0.5 for percentages?) to avoid overly tight scales
        const dataRange = Math.max(dataMax - dataMin, unit === '%' ? 0.5 : 1);

        // Add padding (e.g., 10% of the range, or a fixed amount)
        const padding = dataRange * 0.1;
        calculatedMin = Math.max(0, dataMin - padding); // Don't go below 0
        calculatedMax = dataMax + padding;

        // Special handling for percentages
        if (unit === '%') {
            const percentPadding = Math.max(2, dataRange * 0.1); // At least +/- 2% padding, or 10% of range
            calculatedMin = Math.max(0, dataMin - percentPadding);
            calculatedMax = Math.min(100, dataMax + percentPadding); // Don't exceed 100%
            // Ensure min/max have at least some difference if data is totally flat
            if (calculatedMax - calculatedMin < 1) { // Need at least 1% difference
                calculatedMax = Math.min(100, calculatedMax + 0.5);
                calculatedMin = Math.max(0, calculatedMin - 0.5);
            }
        }
        // Ensure min is less than max after adjustments
        if (calculatedMin >= calculatedMax) {
            calculatedMin = Math.max(0, calculatedMax - (unit === '%' ? 1 : 0.1) ); // Ensure min is below max
        }
    } else { /* Fallback */ 
        calculatedMin = 0;
        calculatedMax = (unit === '%') ? 100 : undefined; // Default scale for percentage or let chart auto-scale others
    }
    
    // Define chart options (axes hidden, dynamic scale)
    const miniChartOptions = {
        responsive: true, 
        maintainAspectRatio: false, 
        animation: { duration: 0 },
        scales: { 
            x: { display: false }, 
            y: { 
                display: false, 
                min: calculatedMin, 
                max: calculatedMax,
                beginAtZero: true // Force the y-axis to start at zero
            } 
        },
        plugins: { 
            legend: { display: false }, 
            tooltip: { enabled: true } 
        },
        elements: { 
            point: { radius: 0 }, 
            line: { borderWidth: 1.5, tension: 0.3 } 
        }
    };
    
    const valueFormatter = (val) => `${val?.toFixed(1) ?? 'N/A'} ${unit || ''}`;

    return (
        <div className="h-[55px] w-full relative opacity-80 -mx-4 -mb-3 mt-1">
            {validDataPoints.length >= 2 ? (
                <HistoricalChart
                    data={validDataPoints}
                    timestamps={timestamps.slice(-validDataPoints.length)}
                    label={label}
                    color={color}
                    fillColor={fillColor}
                    showFill={true}
                    options={miniChartOptions}
                    valueFormatter={valueFormatter}
                    minY={0} // Explicitly set minY to 0
                />
            ) : (
                <div className="flex items-center justify-center h-full text-sci-text-light-secondary dark:text-sci-text-dark-secondary text-xl opacity-30">
                    No data available
                </div>
            )}
        </div>
    );
};


function OverviewTab() {
  // Selectors and Data Prep (include disk_data)
  const systemData = useSelector((state) => state.systemData);
  const {
    cpu_usage = [], cpu_history = [],
    memory_used = 0, memory_total = 1, memory_history = [],
    network_data = {},
    disk_data = {}, // Use disk_data map
    gpu_data = [],
    top_processes = [],
    system_disk_read_history = [], system_disk_write_history = [],
    timestamp
  } = systemData;

  // State for context menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, process: null });

  // --- Prepare Data ---
  const filterHistory = (history) => Array.isArray(history) ? history.filter(v => v !== null && !isNaN(v)) : [];

  // CPU, Memory, Network Prep
  const avgCpu = cpu_usage.length > 0 ? (cpu_usage.reduce((a, b) => a + (b || 0), 0) / Math.max(1, cpu_usage.length) ) : 0;
  const memPercent = memory_total > 0 ? ((memory_used / memory_total) * 100) : 0;
  let totalNetworkRx = 0, totalNetworkTx = 0;
  Object.values(network_data || {}).forEach(net => { totalNetworkRx += net.current_rx_speed || 0; totalNetworkTx += net.current_tx_speed || 0; });

  // Calculate Sum of Per-Disk I/O
  let totalSimulatedRead = 0;
  let totalSimulatedWrite = 0;
  Object.values(disk_data || {}).forEach(disk => {
      totalSimulatedRead += disk.read_bytes_per_sec || 0;
      totalSimulatedWrite += disk.write_bytes_per_sec || 0;
  });

  // GPU & Process Prep
  const gpus = gpu_data || [];
  const topProcesses = top_processes?.slice(0, 6) || [];

  // History Prep
  const cpuHistoryAvg = filterHistory(cpu_history);
  const memHistoryPercent = filterHistory(memory_history);
  const networkRxHistory = filterHistory(Object.values(network_data || {})?.[0]?.rx_history);
  const diskReadHistForChart = filterHistory(system_disk_read_history);
  const diskWriteHistForChart = filterHistory(system_disk_write_history);
  const diskTotalHistForChart = diskReadHistForChart.map((r, i) => (r || 0) + (diskWriteHistForChart[i] || 0));

  // Estimate timestamps
   const historyLength = Math.max(
       cpuHistoryAvg.length, memHistoryPercent.length, diskReadHistForChart.length, networkRxHistory.length, 1
   );
   const chartTimestamps = React.useMemo(() => Array.from({ length: historyLength }, (_, i) =>
       new Date(Date.now() - (historyLength - i - 1) * 1000).toISOString()
   ), [historyLength]);

  // Helper to render a main metric panel
  const renderMainPanel = (id, title, icon, value, unit, historyData, historyLabel, historyColor, historyFill, index, details = null, showChart = true) => (
     <motion.div 
       className={clsx(
         "flex flex-col min-h-[180px] relative overflow-hidden rounded-md",
         "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
         "border border-sci-border-light dark:border-sci-border-dark",
         "shadow-sci-light dark:shadow-sci-dark"
       )} 
       id={`panel-${id}`} 
       variants={panelVariants} 
       initial="hidden" 
       animate="visible" 
       custom={index}
     >
         {/* Header */}
         <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
           <div className="flex items-center gap-2">
             {icon}
             <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
               {title}
             </h3>
           </div>
         </div>
         
         {/* Body */}
         <div className="p-4 flex-grow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                    {title}
                  </div>
                  <div className={clsx(
                    "text-3xl md:text-4xl font-mono font-medium leading-none",
                    id === "cpu" ? getCpuColorClass(value) : id === "memory" ? getMemoryColorClass(value) : "text-sci-text-light dark:text-sci-text-dark"
                  )}>
                    {value}{unit}
                  </div>
                  {details && <div className="mt-1 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">{details}</div>}
                </div>
              </div>
              
              {/* Chart (conditionally shown) */}
              {showChart && historyData.length > 0 && (
                <div className="mt-5 h-36">
                  <HistoricalChart 
                    data={historyData}
                    timestamps={chartTimestamps}
                    label={historyLabel}
                    yAxisLabel={unit === '%' ? 'Usage (%)' : ''}
                    color={historyColor}
                    fillColor={historyFill}
                    valueFormatter={(val) => `${val.toFixed(1)}${unit}`}
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
  );

  // Custom disk panel for multiple disks
  const renderMultiDiskPanel = (index) => {
    // Get all disks from disk_data
    const disks = Object.entries(disk_data || {});
    
    return (
      <motion.div 
        className={clsx(
          "flex flex-col min-h-[180px] relative overflow-hidden rounded-md",
          "bg-sci-bg-light-alt dark:bg-sci-bg-dark-alt",
          "border border-sci-border-light dark:border-sci-border-dark",
          "shadow-sci-light dark:shadow-sci-dark"
        )} 
        id="panel-disk" 
        variants={panelVariants} 
        initial="hidden" 
        animate="visible" 
        custom={index}>
        
        {/* Header - Standardized with other panels */}
        <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
          <div className="flex items-center gap-2">
            <LuDisc3 className="text-yellow-500 dark:text-yellow-400" />
            <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
              Disk I/O
            </h3>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4 flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary mb-1">
                Total I/O
              </div>
              <div className="text-3xl md:text-4xl font-mono font-medium leading-none text-sci-text-light dark:text-sci-text-dark">
                {formatSpeed(totalSimulatedRead + totalSimulatedWrite)}
              </div>
              <div className="mt-1 text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                /s
              </div>
            </div>
          </div>
          
          {/* Multiple Disks List */}
          <div className="text-sm">
            {disks.length > 0 ? (
              <div className="space-y-2">
                {disks.map(([name, disk], idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="font-medium text-sci-text-light dark:text-sci-text-dark truncate" title={name}>{name}</div>
                    <div className="flex justify-between text-sci-text-light-secondary dark:text-sci-text-dark-secondary font-mono">
                      <span className="inline-flex items-center" title="Read speed">
                        R: {formatSpeed(disk.read_bytes_per_sec || 0)}/s
                      </span>
                      <span className="inline-flex items-center" title="Write speed">
                        W: {formatSpeed(disk.write_bytes_per_sec || 0)}/s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary italic py-2">
                No disk data available.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuActivity className="text-blue-500 dark:text-blue-400" />
          System Overview
        </h2>
      </div>
      
      {/* Main Panels Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {renderMainPanel(
          "cpu", 
          "CPU Load", 
          <LuCpu className="text-blue-500 dark:text-blue-400" />, 
          avgCpu.toFixed(1), 
          "%", 
          cpuHistoryAvg, 
          "CPU Usage", 
          "rgba(59, 130, 246, 1)", // blue-500
          "rgba(59, 130, 246, 0.1)", 
          0
        )}
        
        {renderMainPanel(
          "memory", 
          "Memory", 
          <LuMemoryStick className="text-pink-500 dark:text-pink-400" />, 
          memPercent.toFixed(1), 
          "%", 
          memHistoryPercent, 
          "Memory Usage", 
          "rgba(236, 72, 153, 1)", // pink-500
          "rgba(236, 72, 153, 0.15)", 
          1, 
          `${memory_used.toFixed(1)}/${memory_total.toFixed(1)} GB`
        )}
        
        {renderMainPanel(
          "network", 
          "Network", 
          <LuNetwork className="text-green-500 dark:text-green-400" />, 
          formatSpeed(totalNetworkRx + totalNetworkTx), 
          "", 
          networkRxHistory, 
          "Network Traffic", 
          "rgba(34, 197, 94, 1)", // green-500
          "rgba(34, 197, 94, 0.15)", 
          2, 
          `↓${formatSpeed(totalNetworkRx)} ↑${formatSpeed(totalNetworkTx)}`
        )}
        
        {/* Updated Disk I/O Panel */}
        {renderMultiDiskPanel(3)}
      </div>
      
      {/* Secondary Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* GPU Panel */}
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
          custom={4}
        >
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              <BsGpuCard className="text-purple-500 dark:text-purple-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                Graphics Units
              </h3>
            </div>
          </div>
          
          <div className="p-4 flex-grow overflow-y-auto space-y-2.5">
            {gpus.length > 0 ? gpus.map((gpu, index) => ( 
              <div key={index} className="text-sm"> 
                <span className="block font-medium text-sci-text-light dark:text-sci-text-dark truncate mb-0.5" title={gpu.name}>{gpu.name}</span> 
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary"> 
                  <span className="inline-flex items-center gap-1" title="Utilization">
                    <LuActivity className="w-3 h-3 opacity-80"/> {gpu.utilization?.toFixed(0)}%
                  </span> 
                  <span className="inline-flex items-center gap-1" title="Temperature">
                    <LuThermometer className="w-3 h-3 opacity-80"/> {gpu.temperature?.toFixed(0)}°C
                  </span> 
                  <span className="inline-flex items-center gap-1" title="Memory">
                    <LuDatabase className="w-3 h-3 opacity-80"/> {gpu.memory_used?.toFixed(1)}/{gpu.memory_total?.toFixed(1)}GB
                  </span> 
                </div> 
              </div> 
            )) : (
              <div className="text-center text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary italic py-4">
                No GPU detected.
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Processes Panel */}
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
          custom={5}
        >
          <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
            <div className="flex items-center gap-2">
              <LuList className="text-blue-500 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                Active Processes
              </h3>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            {topProcesses.length > 0 ? ( 
              <ul className="px-4 py-2 divide-y divide-sci-border-light dark:divide-sci-border-dark"> 
                {topProcesses.map(([pid, name, cpu, mem]) => ( 
                  <li 
                    key={pid} 
                    className="flex justify-between items-center py-2 text-sm cursor-pointer hover:bg-sci-bg-light hover:dark:bg-sci-bg-dark" 
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        process: [pid, name, cpu, mem]
                      });
                    }}
                  > 
                    <span className="text-sci-text-light dark:text-sci-text-dark truncate pr-2" title={name}>{name}</span> 
                    <span className="flex space-x-3 text-xs font-mono text-sci-text-light-secondary dark:text-sci-text-dark-secondary flex-shrink-0"> 
                      <span className={clsx("w-12 text-right", getCpuColorClass(cpu))}>{cpu?.toFixed(1)}%</span> 
                      <span className="w-14 text-right">{mem || 0}MB</span> 
                    </span> 
                  </li> 
                ))}
              </ul>
            ) : (
              <div className="text-center text-sm text-sci-text-light-secondary dark:text-sci-text-dark-secondary italic py-4">
                No process data.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    
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
            PID: {contextMenu.process?.[0]} - {contextMenu.process?.[1]?.substring(0, 20)}
            {contextMenu.process?.[1]?.length > 20 ? '...' : ''}
          </div>
          <button
            className={clsx(
              "w-full px-4 py-2 text-left text-sm",
              "flex items-center gap-2",
              "hover:bg-sci-bg-light hover:dark:bg-sci-bg-dark"
            )}
            onClick={() => {
              // Close the context menu
              setContextMenu({ visible: false, x: 0, y: 0, process: null });
              
              // Display a simple alert message
              alert("Process termination is yet to be implemented");
            }}
          >
            <LuX className="h-4 w-4 text-red-500" />
            <span>Terminate Process</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default OverviewTab;