// TauriViteReact/src/collectors/gpu.rs (Show Both GPUs)

use crate::models::{GpuData, HISTORY_LENGTH};
// Corrected: Removed unused MonitorError import
use crate::utils::error::Result;
use std::collections::{HashMap, HashSet}; // Import HashSet
use sysinfo::System;

// --- Import Correct Helper Functions ---
#[cfg(target_os = "linux")]
use crate::collectors::linux_gpu_helpers::collect_amd_intel_gpu_data;
#[cfg(all(target_os = "linux", feature = "nvml-support"))] // Ensure feature name matches Cargo.toml
use crate::collectors::linux_gpu_helpers::collect_nvidia_gpu_data;
#[cfg(target_os = "macos")]
use crate::collectors::macos_gpu_helpers::collect_macos_gpu_data;
#[cfg(target_os = "windows")]
use crate::collectors::windows_gpu_helpers::collect_windows_gpu_data;

// --- Use Nvml type directly if feature is enabled ---
#[cfg(feature = "nvml-support")] // Ensure feature name matches Cargo.toml
use nvml_wrapper::Nvml;

/// Public entry point for collecting GPU data.
pub fn collect_gpu_data_entry(
    system: &System,
    cpu_usage: &[f64],
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<Vec<GpuData>> {
    let mut gpu_data_list: Vec<GpuData> = Vec::new();
    let mut error_occurred = false;
    // Keep track of names to avoid duplicates if both methods find the same card somehow
    let mut collected_gpu_names = HashSet::new();

    // --- Platform Specific Collection ---

    // --- Try NVML First (Linux/Windows with NVIDIA) ---
    // Corrected: Wrapped NVML specific call in its cfg block
    #[cfg(all(feature = "nvml-support", target_os="linux"))] // Only try NVML on Linux for now
    {
        match Nvml::init() {
            Ok(nvml) => {
                // Corrected: Call NVML collection only within the cfg block
                if let Err(e) = collect_nvidia_gpu_data(&nvml, &mut gpu_data_list, gpu_history) {
                    log::warn!("NVML GPU data collection failed: {}", e); // Log warning instead of setting flag
                    // error_occurred = true; // Mark error but continue if possible
                } else {
                    // Add names to our set
                    for gpu in &gpu_data_list {
                        collected_gpu_names.insert(gpu.name.clone());
                    }
                }
            }
            Err(e) => {
                // NVML initialization failed, log and continue
                 log::debug!("NVML initialization failed, skipping NVML collection: {}", e);
            }
        }
    }
     // --- Add #[cfg(not(feature = "nvml-support"))] block for completeness if needed ---
     // #[cfg(not(feature = "nvml-support"))]
     // {
     //    log::debug!("NVML support feature is not enabled.");
     // }

    // --- Try Platform Specific Helpers (AMD/Intel/Fallback) ---
    // We now run these *regardless* of whether NVML found anything,
    // but we check the collected_gpu_names HashSet to avoid adding duplicates.

    #[cfg(target_os = "linux")]
    {
        let mut fallback_gpus: Vec<GpuData> = Vec::new(); // Collect into a temporary list
        if let Err(e) = collect_amd_intel_gpu_data(&mut fallback_gpus, gpu_history) {
             log::warn!("Linux AMD/Intel fallback collection failed: {}", e);
             // error_occurred = true;
        } else if !fallback_gpus.is_empty() {
            // Add GPUs from fallback *only if* the name wasn't already added by NVML
            for gpu in fallback_gpus {
                if collected_gpu_names.insert(gpu.name.clone()) {
                     gpu_data_list.push(gpu);
                } else {
                     log::trace!("Skipping duplicate GPU (from fallback): {}", gpu.name);
                }
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        let mut windows_gpus: Vec<GpuData> = Vec::new();
        // Corrected: Call the Windows specific helper function here
        if let Err(e) = collect_windows_gpu_data(&mut windows_gpus, gpu_history) {
             log::warn!("Windows GPU collection failed: {}", e);
             // error_occurred = true;
        } else if !windows_gpus.is_empty() {
             for gpu in windows_gpus {
                if collected_gpu_names.insert(gpu.name.clone()) {
                     gpu_data_list.push(gpu);
                } else {
                    log::trace!("Skipping duplicate GPU (from Windows helper): {}", gpu.name);
                }
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        let mut macos_gpus: Vec<GpuData> = Vec::new();
         if let Err(e) = collect_macos_gpu_data(&mut macos_gpus, gpu_history) {
              log::warn!("macOS GPU collection failed: {}", e);
              // error_occurred = true;
         } else if !macos_gpus.is_empty() {
              for gpu in macos_gpus {
                 if collected_gpu_names.insert(gpu.name.clone()) {
                      gpu_data_list.push(gpu);
                 } else {
                      log::trace!("Skipping duplicate GPU (from macOS helper): {}", gpu.name);
                 }
             }
         }
    }

    // --- Fallback Simulation (Only if absolutely nothing was found AND no errors occurred during specific collection attempts) ---
    // Refined logic: Only simulate if list is empty *and* no platform-specific attempt resulted in an error we logged.
    // Note: `error_occurred` flag usage removed for simplicity, relying on logs.
    if gpu_data_list.is_empty() {
         log::info!("No specific GPU data collected, attempting fallback simulation.");
        // Corrected: Pass system, cpu_usage, gpu_data_list, gpu_history
        if let Err(e) = collect_fallback_gpu_data(system, cpu_usage, &mut gpu_data_list, gpu_history){
            log::error!("Fallback GPU simulation failed: {}", e);
        }
    }

    if gpu_data_list.is_empty() {
        log::warn!("Final GPU data list is empty after all collection attempts.");
    } else {
        log::debug!("Final GPU data list contains {} GPUs.", gpu_data_list.len());
    }


    Ok(gpu_data_list)
}


/// Fallback GPU data collection (Ensure this is NOT pub)
fn collect_fallback_gpu_data(
    _system: &System,
    cpu_usage: &[f64],
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<()> { // Now returns Result
    if !gpu_data.is_empty() { return Ok(()); } // Already have data
    if !should_simulate_gpu() {
        log::debug!("GPU simulation skipped based on platform check.");
        return Ok(());
    } // Check if simulation is appropriate

    log::info!("Simulating integrated GPU data based on CPU usage.");
    let gpu_name = "Simulated Integrated GPU".to_string();
    // Avoid division by zero if cpu_usage is empty
    let cpu_avg = if !cpu_usage.is_empty() {
        cpu_usage.iter().map(|&v| v.max(0.0)).sum::<f64>() / cpu_usage.len() as f64 // Ensure non-negative
    } else {
        0.0
    };

    let gpu_utilization = (cpu_avg * 0.8).clamp(0.0, 100.0); // Estimate based on CPU avg

    // Update history for the simulated GPU
    let history = gpu_history
        .entry(gpu_name.clone())
        .or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));

    if history.len() >= HISTORY_LENGTH {
        history.remove(0);
    }
    history.push(gpu_utilization);

    gpu_data.push(GpuData {
        name: gpu_name,
        utilization: gpu_utilization,
        temperature: (45.0 + (gpu_utilization * 0.3)).clamp(30.0, 90.0), // Estimate temp
        memory_used: (0.5 + (gpu_utilization / 100.0) * 1.5).clamp(0.1, 4.0), // Estimate VRAM used
        memory_total: 4.0, // Assume 4GB total for simulation
        power_usage: (5.0 + (gpu_utilization * 0.15)).clamp(3.0, 25.0), // Estimate power
        utilization_history: history.clone(), // Clone the updated history
    });
    log::debug!("Added simulated GPU data.");
    Ok(())
}

/// Determines if fallback simulation should occur (Ensure this is NOT pub)
fn should_simulate_gpu() -> bool {
    // Keep this logic simple based on OS for now
    #[cfg(target_os = "linux")] { true } // Assume Linux might have iGPU
    #[cfg(target_os = "windows")] { true } // Assume Windows might have iGPU
    #[cfg(target_os = "macos")] { true } // Assume Mac might have iGPU
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))] { false } // Default false
}