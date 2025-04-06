use crate::models::HISTORY_LENGTH; // Corrected: Import from models
use crate::utils::error::{MonitorError, Result};// Corrected: Use Result from utils
use sysinfo::{System, SystemExt};

/// Collects current memory usage (Used GB, Total GB, Used %)
pub fn collect_memory_info(system: &System) -> Result<(f64, f64, f64)> { // Made pub
    let total_gb = system.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let used_gb = system.used_memory() as f64 / (1024.0 * 1024.0 * 1024.0);

    if total_gb <= 0.0 {
        Err(MonitorError::SystemInfo(
            "Invalid total memory reported.".to_string(),
        ))
    } else {
        let used_percent = (used_gb / total_gb) * 100.0;
        Ok((used_gb, total_gb, used_percent))
    }
}

/// Updates the historical data for memory usage percentage
pub fn update_memory_history(current_percent: f64, history: &mut Vec<f64>) -> Result<()> { // Made pub
    if history.len() >= HISTORY_LENGTH {
        history.remove(0);
    }
    history.push(current_percent.clamp(0.0, 100.0)); // Ensure value is clamped
    Ok(())
}