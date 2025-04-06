// TauriViteReact/src/utils/formatting.js

/**
 * Formats speed in KB/s to a human-readable string (KB/s, MB/s, GB/s).
 * @param {number} speedInKBps Speed in Kilobytes per second.
 * @returns {string} Formatted speed string.
 */
export function formatSpeed(speedInKBps) {
    if (speedInKBps < 0) return '0 B/s'; // Handle negative values if they occur
    if (speedInKBps < 1024) {
        return `${speedInKBps.toFixed(1)} KB/s`;
    }
    const speedInMBps = speedInKBps / 1024;
    if (speedInMBps < 1024) {
        return `${speedInMBps.toFixed(1)} MB/s`;
    }
    const speedInGBps = speedInMBps / 1024;
    return `${speedInGBps.toFixed(1)} GB/s`;
}

/**
 * Formats size in Bytes to a human-readable string (B, KB, MB, GB, TB).
 * @param {number} bytes Size in bytes.
 * @param {number} decimals Number of decimal places (default: 1).
 * @returns {string} Formatted size string.
 */
export function formatBytes(bytes, decimals = 1) {
    // Handle edge cases
    if (bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    
    // Convert to absolute value to handle negative bytes (shouldn't happen, but just in case)
    bytes = Math.abs(bytes);
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    // Special handling for very small values (below 1 KB)
    if (bytes < 1) {
        return `${(bytes * 1024).toFixed(dm)} Bytes`;
    }
    
    // Calculate the appropriate unit
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Format with the appropriate unit
    // Ensure we don't go beyond the sizes array bounds
    const unitIndex = Math.min(i, sizes.length - 1);
    
    return parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm)) + ' ' + sizes[unitIndex];
}

/**
 * Get a CSS class based on CPU percentage
 * @param {number} percentage CPU usage percentage
 * @returns {string} CSS class name
 */
export function getCpuColorClass(percentage) {
    if (percentage > 85) return 'usage-critical';
    if (percentage > 60) return 'usage-high';
    if (percentage > 30) return 'usage-medium';
    return 'usage-low';
}

/**
 * Get a CSS class based on Memory/Disk percentage
 * @param {number} percentage Memory/Disk usage percentage
 * @returns {string} CSS class name
 */
export function getMemoryColorClass(percentage) {
    if (percentage > 90) return 'usage-critical';
    if (percentage > 75) return 'usage-high';
    if (percentage > 50) return 'usage-medium';
    return 'usage-low';
}

/**
 * Format a number with comma separators for thousands
 * @param {number} num The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Truncate text with ellipsis if it exceeds maxLength
 * @param {string} text Text to truncate
 * @param {number} maxLength Maximum length before truncation (default: 20)
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 20) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Format a percentage value with fixed decimals and % sign
 * @param {number} value The percentage value
 * @param {number} decimals Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Get temperature color class based on temperature value
 * @param {number} temperature Temperature in Celsius
 * @returns {string} CSS class name
 */
export function getTemperatureColorClass(temperature) {
    if (temperature > 85) return 'temperature critical';
    if (temperature > 75) return 'temperature high';
    if (temperature > 60) return 'temperature medium';
    return 'temperature normal';
}

/**
 * Format a timestamp as a time ago string (e.g., "5m ago", "2h ago")
 * @param {number|string} timestamp The timestamp to format (Unix timestamp or ISO string)
 * @returns {string} Formatted "time ago" string
 */
export function formatTimeAgo(timestamp) {
    // Convert string timestamp to Date if needed
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    // Handle invalid dates
    if (isNaN(seconds)) return 'Unknown';
    
    // Time intervals in seconds
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    // Find the appropriate interval
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    // Default to formatted date for older timestamps
    return date.toLocaleDateString();
}

/**
 * Format timestamp for chart labels (e.g. "14:30:45")
 * @param {number|string} timestamp The timestamp to format
 * @returns {string} Formatted time string
 */
export function formatTimeForChart(timestamp) {
    // Convert string timestamp to Date if needed
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    
    // Handle invalid dates
    if (isNaN(date.getTime())) return '';
    
    // Format as HH:MM:SS
    return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
    });
}