import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LuNetwork, LuActivity, LuArrowDown, LuArrowUp, LuRefreshCw, LuWifi, LuChartBar, LuRadar } from "react-icons/lu";
import { BsArrowDownCircle, BsArrowUpCircle } from "react-icons/bs";
import { formatSpeed, formatBytes } from '../utils/formatting';
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

function NetworkTab() {
  const { network_data } = useSelector((state) => state.systemData);
  const interfaces = Object.entries(network_data || {});
  
  // Calculate totals
  const totalRx = interfaces.reduce((sum, [_, data]) => sum + data.current_rx_speed, 0);
  const totalTx = interfaces.reduce((sum, [_, data]) => sum + data.current_tx_speed, 0);
  
  // Create timestamps array for history visualizations
  const timestamps = Array.from({ length: 100 }, (_, i) => 
    new Date(Date.now() - (100 - i - 1) * 1000).toISOString()
  );
  
  // Colors for network visualization
  const downloadColor = 'rgba(52, 152, 219, 1)'; // blue
  const downloadFillColor = 'rgba(52, 152, 219, 0.1)';
  const uploadColor = 'rgba(231, 76, 60, 1)'; // red
  const uploadFillColor = 'rgba(231, 76, 60, 0.1)';
  
  // Helper to determine if an interface is active (has significant traffic)
  const isInterfaceActive = (data) => data.current_rx_speed > 10 || data.current_tx_speed > 10;
  
  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2">
          <LuNetwork className="text-green-500 dark:text-green-400" />
          Network Activity
        </h2>
      </div>
      
      {interfaces.length === 0 ? (
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
          <LuWifi className="mx-auto h-10 w-10 text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-30 mb-3" />
          <p className="text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
            No network interface data available.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Network Summary */}
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
                <LuActivity className="text-green-500 dark:text-green-400" />
                <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark">
                  Overall Network Activity
                </h3>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Download Stats */}
                <div className={clsx(
                  "p-4 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <LuArrowDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                        Download
                      </div>
                      <div className="text-xl font-mono font-medium text-blue-600 dark:text-blue-400">
                        {formatSpeed(totalRx)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Upload Stats */}
                <div className={clsx(
                  "p-4 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <LuArrowUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                        Upload
                      </div>
                      <div className="text-xl font-mono font-medium text-red-600 dark:text-red-400">
                        {formatSpeed(totalTx)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Total Stats */}
                <div className={clsx(
                  "p-4 rounded-md",
                  "bg-sci-bg-light dark:bg-sci-bg-dark",
                  "border border-sci-border-light dark:border-sci-border-dark"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <LuRefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                        Total
                      </div>
                      <div className="text-xl font-mono font-medium text-green-600 dark:text-green-400">
                        {formatSpeed(totalRx + totalTx)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Traffic History Charts */}
              <div className="border-t border-sci-border-light dark:border-sci-border-dark pt-4 mt-4">
                <div className="flex items-center gap-1.5 mb-4">
                  <LuChartBar className="h-4 w-4 text-green-500 dark:text-green-400" />
                  <span className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                    Traffic History
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Download Speed Chart */}
                  {interfaces.length > 0 && interfaces[0][1].rx_history && interfaces[0][1].rx_history.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                        <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                          Download Speed
                        </div>
                      </div>
                      <div className="h-32">
                        <HistoricalChart 
                          data={interfaces[0][1].rx_history}
                          timestamps={timestamps.slice(-interfaces[0][1].rx_history.length)}
                          label="Download"
                          yAxisLabel="KB/s"
                          color={downloadColor}
                          fillColor={downloadFillColor}
                          valueFormatter={(val) => formatSpeed(val)}
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
                  
                  {/* Upload Speed Chart */}
                  {interfaces.length > 0 && interfaces[0][1].tx_history && interfaces[0][1].tx_history.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-2 w-2 bg-red-500 dark:bg-red-400 rounded-full"></div>
                        <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                          Upload Speed
                        </div>
                      </div>
                      <div className="h-32">
                        <HistoricalChart 
                          data={interfaces[0][1].tx_history}
                          timestamps={timestamps.slice(-interfaces[0][1].tx_history.length)}
                          label="Upload"
                          yAxisLabel="KB/s"
                          color={uploadColor}
                          fillColor={uploadFillColor}
                          valueFormatter={(val) => formatSpeed(val)}
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
            </div>
          </motion.div>
          
          {/* Network Interfaces */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-sci-text-light dark:text-sci-text-dark flex items-center gap-2 mb-4">
              <LuWifi className="text-green-500 dark:text-green-400" />
              Network Interfaces
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {interfaces.map(([name, data], index) => {
                // Calculate total data transferred
                const totalReceived = formatBytes(data.total_rx_bytes || 0);
                const totalSent = formatBytes(data.total_tx_bytes || 0);
                const isActive = isInterfaceActive(data);
                
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
                    custom={index + 1} // +1 because the summary panel is 0
                  >
                    {/* Interface Header */}
                    <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LuRadar className="text-green-500 dark:text-green-400" />
                          <h3 className="text-base font-semibold text-sci-text-light dark:text-sci-text-dark truncate">
                            {name}
                          </h3>
                        </div>
                        <div className={clsx(
                          "w-3 h-3 rounded-full transition-all duration-300",
                          isActive 
                            ? "bg-green-500 dark:bg-green-400 animate-pulse" 
                            : "bg-gray-300 dark:bg-gray-600"
                        )}></div>
                      </div>
                    </div>
                    
                    {/* Interface Stats */}
                    <div className="p-4 border-b border-sci-border-light dark:border-sci-border-dark">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <BsArrowDownCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                              Download
                            </div>
                          </div>
                          <div className="font-mono text-lg font-medium text-blue-600 dark:text-blue-400">
                            {formatSpeed(data.current_rx_speed)}
                          </div>
                          <div className="mt-1 text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                            Total: {totalReceived}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <BsArrowUpCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            <div className="text-xs uppercase text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                              Upload
                            </div>
                          </div>
                          <div className="font-mono text-lg font-medium text-red-600 dark:text-red-400">
                            {formatSpeed(data.current_tx_speed)}
                          </div>
                          <div className="mt-1 text-xs text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                            Total: {totalSent}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Interface Charts */}
                    {data.rx_history && data.rx_history.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <LuChartBar className="h-4 w-4 text-green-500 dark:text-green-400" />
                          <span className="text-xs uppercase tracking-wider text-sci-text-light-secondary dark:text-sci-text-dark-secondary">
                            Traffic History
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Download History */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                              <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                                Download
                              </div>
                            </div>
                            <div className="h-24">
                              <HistoricalChart 
                                data={data.rx_history}
                                timestamps={timestamps.slice(-data.rx_history.length)}
                                label="Download"
                                yAxisLabel="KB/s"
                                color={downloadColor}
                                fillColor={downloadFillColor}
                                valueFormatter={(val) => formatSpeed(val)}
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
                          
                          {/* Upload History */}
                          {data.tx_history && data.tx_history.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="h-2 w-2 bg-red-500 dark:bg-red-400 rounded-full"></div>
                                <div className="text-xs font-medium text-sci-text-light dark:text-sci-text-dark">
                                  Upload
                                </div>
                              </div>
                              <div className="h-24">
                                <HistoricalChart 
                                  data={data.tx_history}
                                  timestamps={timestamps.slice(-data.tx_history.length)}
                                  label="Upload"
                                  yAxisLabel="KB/s"
                                  color={uploadColor}
                                  fillColor={uploadFillColor}
                                  valueFormatter={(val) => formatSpeed(val)}
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
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NetworkTab;