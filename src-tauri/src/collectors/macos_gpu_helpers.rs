#![cfg(target_os = "macos")] // Only compile on macOS

// Import Result only from utils/error
use crate::models::GpuData;
use crate::utils::error::{MonitorError, Result};
use std::collections::HashMap;
use std::process::Command;

// Define a constant for history length since it's not available in the collectors module
const HISTORY_LENGTH: usize = 60; // Using 60 as a reasonable default for history length

pub fn collect_macos_gpu_data(
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<()> {
    log::debug!("Attempting to collect macOS GPU data via system_profiler...");
    let mut found_gpus = std::collections::HashSet::new();

    // Use system_profiler SPDisplaysDataType - JSON output
    if let Ok(output) = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
    {
        if let Ok(json_str) = String::from_utf8(output.stdout) {
            match serde_json::from_str::<serde_json::Value>(&json_str) {
                Ok(json) => {
                    if let Some(displays_data) = json.get("SPDisplaysDataType") {
                        if let Some(displays_arr) = displays_data.as_array() {
                            for display in displays_arr {
                                let name = display.get("sppci_model")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown Mac GPU")
                                    .trim()
                                    .to_string();

                                // Skip if already processed (e.g., multiple entries for same device)
                                if found_gpus.contains(&name) { continue; }

                                // VRAM is often reported in MB (e.g., "512 MB")
                                let memory_total_gb = display.get("spdisplays_vram")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| s.split_whitespace().next()) // Get the number part
                                    .and_then(|num_str| num_str.parse::<f64>().ok())
                                    .map(|mb| mb / 1024.0) // Convert MB to GB
                                    .unwrap_or(estimate_vram(&name)); // Estimate if parsing fails

                                // --- Get Utilization/Temp/Power (Difficult on macOS without dedicated tools/libs) ---
                                // For M-series Macs, `powermetrics` might provide some data, but requires parsing.
                                // For Intel Macs, `istats` or similar might work.
                                // Let's provide estimated values for now.

                                let (utilization, temperature, power_usage) = estimate_macos_gpu_metrics(&name);

                                // Estimate memory used based on utilization
                                let memory_used_gb = (utilization / 100.0) * memory_total_gb;

                                // Update history
                                let history = gpu_history
                                    .entry(name.clone())
                                    .or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
                                if history.len() >= HISTORY_LENGTH { history.remove(0); }
                                history.push(utilization);

                                log::debug!("Adding GPU from system_profiler: {}", name);
                                gpu_data.push(GpuData {
                                    name: name.clone(),
                                    utilization,
                                    temperature,
                                    memory_used: memory_used_gb.clamp(0.0, memory_total_gb),
                                    memory_total: memory_total_gb,
                                    power_usage,
                                    utilization_history: history.clone(),
                                });
                                found_gpus.insert(name);
                            }
                        } else {
                            log::warn!("SPDisplaysDataType is not an array in system_profiler output.");
                        }
                    } else {
                        log::warn!("Could not find SPDisplaysDataType in system_profiler JSON.");
                    }
                }
                Err(e) => log::warn!("Failed to parse system_profiler JSON: {}", e),
            }
        } else {
            log::warn!("system_profiler output is not valid UTF-8.");
        }
    } else {
        log::warn!("`system_profiler` command failed or not found.");
        // Optionally return an error here if system_profiler is critical
        // return Err(MonitorError::GpuInfo("system_profiler command failed".into()));
    }

    // If no GPUs found via system_profiler, add a generic placeholder
    if gpu_data.is_empty() {
        log::warn!("No GPUs found via system_profiler, adding generic placeholder.");
        let name = "Mac Graphics".to_string();
        let (utilization, temperature, power_usage) = estimate_macos_gpu_metrics(&name);
        let memory_total_gb = 2.0; // Default assumption
        let memory_used_gb = (utilization / 100.0) * memory_total_gb;

        let history = gpu_history
            .entry(name.clone())
            .or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
        if history.len() >= HISTORY_LENGTH { history.remove(0); }
        history.push(utilization);

        gpu_data.push(GpuData {
            name, utilization, temperature,
            memory_used: memory_used_gb, memory_total: memory_total_gb,
            power_usage, utilization_history: history.clone(),
        });
    }

    Ok(())
}

/// Estimates macOS VRAM based on common GPU names (very rough)
fn estimate_vram(name: &str) -> f64 {
    let lower_name = name.to_lowercase();
    if lower_name.contains("intel iris") || lower_name.contains("intel hd") {
        1.5 // GB, typical shared memory amount
    } else if lower_name.contains("radeon pro") {
        4.0 // GB, common for dedicated GPUs
    } else if lower_name.contains("apple m1") || lower_name.contains("apple m2") {
        8.0 // GB, rough unified memory estimate portion for GPU
    } else {
        2.0 // Generic fallback GB
    }
}

/// Estimates utilization, temp, power for macOS GPUs (placeholders)
fn estimate_macos_gpu_metrics(name: &str) -> (f64, f64, f64) {
    let lower_name = name.to_lowercase();
    let utilization = if lower_name.contains("intel") { 15.0 } else { 25.0 }; // %
    let temperature = if lower_name.contains("intel") { 50.0 } else { 55.0 }; // C
    let power_usage = if lower_name.contains("intel") { 10.0 } else { 15.0 }; // W

    (utilization, temperature, power_usage)
}