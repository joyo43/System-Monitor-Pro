// src/components/HistoricalChart.jsx - With Options Fix

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { formatTimeForChart } from '../utils/formatting';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

function HistoricalChart({
  data = [], timestamps = [], label = 'Usage',
  color = 'rgba(75, 192, 192, 1)', fillColor = 'rgba(75, 192, 192, 0.2)',
  showFill = true, minY = 0, maxY, yAxisLabel = 'Value',
  valueFormatter = (val) => val?.toString() ?? 'N/A',
  options: incomingOptions = {}
}) {

  const labels = timestamps.map(ts => formatTimeForChart(ts));
  const chartData = {
    labels: labels,
    datasets: [{
        label: label, data: data, borderColor: color, backgroundColor: fillColor,
        borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, tension: 0.3, fill: showFill,
      }],
  };

  const defaultOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    scales: {
      y: {
        min: (typeof minY === 'number' && !isNaN(minY)) ? minY : undefined,
        max: (typeof maxY === 'number' && !isNaN(maxY)) ? maxY : undefined,
        display: true, // Default show
        grid: { color: 'rgba(125, 140, 154, 0.1)', drawBorder: false },
        ticks: { maxTicksLimit: 5, font: { size: 9 }, color: '#7d8c9a', callback: valueFormatter },
        title: { display: !!yAxisLabel, text: yAxisLabel, font: { size: 10 }, color: '#7d8c9a' }
      },
      x: {
        display: true, // Default show
        grid: { display: false, drawBorder: false },
        ticks: { display: true, autoSkip: true, maxTicksLimit: 6, maxRotation: 0, font: { size: 9 }, color: '#7d8c9a' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true, backgroundColor: 'rgba(10, 15, 20, 0.8)', titleFont: { size: 10 },
        bodyFont: { size: 10 }, padding: 6, boxPadding: 4,
        callbacks: {
          title: (tooltipItems) => tooltipItems[0]?.label || '',
          label: (context) => `${context.dataset.label || ''}: ${valueFormatter(context.raw)}`
        }
      }
    },
    interaction: { intersect: false, mode: 'index' },
  };

  // Simple deep merge helper
  const mergeOptions = (target, source) => {
      for (const key in source) {
          if (source.hasOwnProperty(key)) {
              if (source[key] instanceof Object && key in target && target[key] instanceof Object && !(source[key] instanceof Array) && !(target[key] instanceof Array)) { // Basic object check
                  mergeOptions(target[key], source[key]);
              } else {
                  target[key] = source[key]; // Overwrite/assign
              }
          }
      }
      return target;
  };

  const finalOptions = mergeOptions(JSON.parse(JSON.stringify(defaultOptions)), incomingOptions);

  return (
    <div className="relative h-full w-full"> {/* Use Tailwind classes here if needed */}
      {(data?.length ?? 0) > 0 ? (
        <Line data={chartData} options={finalOptions} />
      ) : (
        // Use Tailwind for placeholder styling
        <div className="flex items-center justify-center h-full text-xs italic text-sci-text-light-secondary dark:text-sci-text-dark-secondary opacity-50">
            No historical data
        </div>
      )}
    </div>
  );
}

export default HistoricalChart;