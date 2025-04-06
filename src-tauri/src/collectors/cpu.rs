// TauriViteReact/src-tauri/src/collectors/cpu.rs (Modified collect_process_info)

use crate::models::HISTORY_LENGTH;
use crate::utils::error::{MonitorError, Result}; // Use explicit path
use sysinfo::{CpuExt, Pid, ProcessExt, System, SystemExt};

/// Collects current CPU usage percentage for each core
pub fn collect_cpu_usage(system: &System) -> Result<Vec<f64>> {
    let usage: Vec<f64> = system.cpus().iter().map(|cpu| cpu.cpu_usage() as f64).collect();
    if usage.is_empty() {
        Err(MonitorError::SystemInfo(
            "No CPU data found.".to_string(),
        ))
    } else {
        Ok(usage)
    }
}

/// Updates the historical data for CPU usage percentages
pub fn update_cpu_history(
    current_usage: &[f64],
    history: &mut Vec<Vec<f64>>,
) -> Result<()> {
    if current_usage.is_empty() {
        return Ok(());
    }
    if history.is_empty() || history.len() != current_usage.len() {
        log::warn!(
            "CPU history length mismatch ({} vs {}) or empty. Reinitializing.",
            history.len(),
            current_usage.len()
        );
        *history = vec![Vec::with_capacity(HISTORY_LENGTH); current_usage.len()];
        for i in 0..current_usage.len() {
            history[i].resize(HISTORY_LENGTH, 0.0);
        }
    }
    for (i, &usage) in current_usage.iter().enumerate() {
        if i < history.len() {
            if history[i].len() >= HISTORY_LENGTH {
                history[i].remove(0);
            }
            history[i].push(usage.clamp(0.0, 100.0));
        } else {
            log::error!(
                "Attempted to update CPU history for core {} but history length is only {}",
                i,
                history.len()
            );
        }
    }
    Ok(())
}

/// Collects information about top processes (PID, Name, CPU%, Memory MB)
// Changed return type to use f32 for CPU %
pub fn collect_process_info(system: &System) -> Result<Vec<(Pid, String, f32, u64)>> {
    let mut processes: Vec<_> = system
        .processes()
        .iter()
        .map(|(pid, proc)| {
            (
                *pid,
                proc.name().to_string(),
                proc.cpu_usage(), // sysinfo::Process::cpu_usage returns f32 directly
                proc.memory() / (1024 * 1024), // Convert Bytes to MB
            )
        })
        .collect();

    if processes.is_empty() {
        log::debug!("No processes found by sysinfo.");
        return Ok(vec![]);
    }

    // Sort by CPU usage descending
    processes.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

    // Take top N (e.g., 15)
    Ok(processes.into_iter().take(15).collect())
}