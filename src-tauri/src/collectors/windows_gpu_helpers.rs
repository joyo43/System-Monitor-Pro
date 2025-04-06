#![cfg(target_os = "windows")] // Only compile on Windows

// Fix the imports
use crate::models::GpuData;
use crate::utils::error::{MonitorError, Result};
use std::collections::HashMap;
use wmi::{COMLibrary, WMIConnection}; // Assuming wmi = "0.12" or similar
use serde::Deserialize; // For WMI results

// Define a constant for history length since it's not available in the collectors module
const HISTORY_LENGTH: usize = 60; // Using 60 as a reasonable default for history length

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_VideoController")]
#[serde(rename_all = "PascalCase")]
struct Win32VideoController {
    // Name: Option<String>, // 'Name' is often less specific than 'Caption'
    Caption: Option<String>,
    AdapterRAM: Option<u32>, // Often in bytes for older WMI, might be MB
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine")]
#[serde(rename_all = "PascalCase")]
struct GpuEngineCounters {
    Name: Option<String>, 
    UtilizationPercentage: Option<u64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "MSAcpi_ThermalZoneTemperature")]
#[serde(rename_all = "PascalCase")]
struct MSAcpiThermalZoneTemperature {
    InstanceName: String,
    CurrentTemperature: u32, // Tenths of Kelvin
}

pub fn collect_windows_gpu_data(
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<()> {
    log::debug!("Attempting to collect Windows GPU data via WMI...");
    let com_lib = COMLibrary::new()?; // Initialize COM for WMI
    let wmi_con = WMIConnection::new(com_lib)?;

    // 1. Get basic GPU info (Name, Total Memory)
    let video_controllers: Vec<Win32VideoController> = wmi_con.query()?;
    if video_controllers.is_empty() {
        log::warn!("WMI query for Win32_VideoController returned no results.");
        // Optionally return Ok or an error
        return Ok(()); // No GPUs found via this method
    }

    let mut collected_gpus: HashMap<String, GpuData> = HashMap::new();

    for controller in &video_controllers {
        let name = controller.Caption.clone().unwrap_or_else(|| "Unknown GPU".to_string());
        // WMI AdapterRAM is often unreliable or in bytes. Use default or query DXGI later if needed.
        let memory_total_gb = controller.AdapterRAM.map_or(4.0, |ram| ram as f64 / (1024.0 * 1024.0)); // Estimate GB

        // Avoid duplicates if multiple controllers report same name (unlikely but possible)
        if !collected_gpus.contains_key(&name) {
            log::trace!("Found WMI VideoController: {}", name);
            collected_gpus.insert(name.clone(), GpuData {
                name,
                utilization: 0.0, // Will be updated later
                temperature: 0.0, // Will be updated later
                memory_used: 0.0, // Will be updated later
                memory_total: memory_total_gb,
                power_usage: 0.0, // WMI doesn't provide this easily
                utilization_history: Vec::new(),
            });
        }
    }

    // 2. Get GPU Utilization (More complex, uses performance counters)
    // This requires matching the counter instance name (pid_xxxx_luid_...) to the adapter.
    // It's often simpler to get the *total* GPU utilization if available.
    // Querying "GPU Engine" provides per-engine stats, summing them is complex.
    // Let's try querying the "GPU Adapter Memory" for total usage instead.
    // Note: Performance counters might need enabling or specific permissions.
    match query_gpu_utilization(&wmi_con) {
        Ok(util_map) => {
            for (name_fragment, utilization) in util_map {
                // Try to match fragment to collected GPU names
                for (gpu_name, gpu) in collected_gpus.iter_mut() {
                    // Basic substring match, might need refinement based on counter names
                    if gpu_name.to_lowercase().contains(&name_fragment.to_lowercase()) {
                        log::trace!("Matched utilization {}% for GPU {}", utilization, gpu_name);
                        gpu.utilization = utilization;
                        break; // Assume first match is correct
                    }
                }
            }
        }
        Err(e) => log::warn!("Failed to query GPU utilization counters: {}", e),
    }

    // 3. Get Temperature (from MSAcpi_ThermalZoneTemperature)
    match wmi_con.query::<MSAcpiThermalZoneTemperature>() {
        Ok(temps) => {
            for temp_zone in temps {
                // WMI InstanceName often includes vendor names like \_TZ.ETMP<...>NVD<...>
                let lower_instance = temp_zone.InstanceName.to_lowercase();
                let temp_c = (temp_zone.CurrentTemperature as f64 / 10.0) - 273.15;

                for (gpu_name, gpu) in collected_gpus.iter_mut() {
                    // Heuristic matching based on name fragments
                    if (lower_instance.contains("nv") || lower_instance.contains("nvidia")) && gpu_name.to_lowercase().contains("nvidia") {
                        gpu.temperature = temp_c.clamp(0.0, 120.0);
                        log::trace!("Matched temperature {:.1}°C for NVIDIA GPU {}", temp_c, gpu_name);
                    } else if (lower_instance.contains("amd") || lower_instance.contains("radeon")) && (gpu_name.to_lowercase().contains("amd") || gpu_name.to_lowercase().contains("radeon")) {
                        gpu.temperature = temp_c.clamp(0.0, 120.0);
                        log::trace!("Matched temperature {:.1}°C for AMD GPU {}", temp_c, gpu_name);
                    } else if lower_instance.contains("intel") && gpu_name.to_lowercase().contains("intel") {
                        gpu.temperature = temp_c.clamp(0.0, 120.0);
                        log::trace!("Matched temperature {:.1}°C for Intel GPU {}", temp_c, gpu_name);
                    }
                }
            }
        }
        Err(e) => log::warn!("Failed to query WMI MSAcpi_ThermalZoneTemperature: {}", e),
    }

    // 4. Estimate missing values and update history
    for (_, gpu) in collected_gpus.iter_mut() {
        // Estimate power based on utilization and vendor if needed
        if gpu.power_usage <= 0.0 {
            gpu.power_usage = estimate_power_usage(gpu.utilization, &gpu.name);
        }
        // Estimate temperature if needed
        if gpu.temperature <= 0.0 {
            gpu.temperature = estimate_temperature(gpu.utilization);
        }

        // Estimate memory used if needed (WMI doesn't provide directly)
        if gpu.memory_used <= 0.0 && gpu.memory_total > 0.0 {
            gpu.memory_used = (gpu.utilization / 100.0) * gpu.memory_total;
        }

        // Update history
        let history = gpu_history
            .entry(gpu.name.clone())
            .or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
        if history.len() >= HISTORY_LENGTH {
            history.remove(0);
        }
        history.push(gpu.utilization);
        gpu.utilization_history = history.clone();

        // Add to the final output list
        gpu_data.push(gpu.clone());
    }

    if gpu_data.is_empty() {
        log::warn!("No GPU data could be collected on Windows.");
    }

    Ok(())
}

/// Helper to query GPU Utilization percentage from WMI Performance Counters
fn query_gpu_utilization(wmi_con: &WMIConnection) -> Result<HashMap<String, f64>> {
    // Try the overall GPU counter first
    #[derive(Deserialize, Debug)]
    #[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory")]
    #[serde(rename_all = "PascalCase")]
    struct GpuAdapterCounters {
        Name: Option<String>, // Usually identifies the adapter
        UtilizationPercentage: Option<u64>,
    }

    let mut utilization_map = HashMap::new();

    match wmi_con.query::<GpuAdapterCounters>() {
        Ok(counters) => {
            for counter in counters {
                if let (Some(name), Some(util)) = (counter.Name, counter.UtilizationPercentage) {
                    // The name might be like "luid_0x0000..." - try to extract a useful part
                    let name_fragment = name.split('_').last().unwrap_or(&name).to_string();
                    utilization_map.insert(name_fragment, util as f64);
                }
            }
            if !utilization_map.is_empty() {
                log::debug!("Found utilization via GPUAdapterMemory: {:?}", utilization_map);
                return Ok(utilization_map); // Return if we found data here
            }
        }
        Err(e) => log::trace!("Query for GPUAdapterMemory counters failed: {}", e), // Trace level
    }

    // Fallback: Try GPUEngine counters (more complex to sum correctly)
    log::debug!("GPUAdapterMemory counters failed or empty, trying GPUEngine counters...");
    let engine_counters: Vec<GpuEngineCounters> = wmi_con.query()?;
    for counter in engine_counters {
        if let (Some(name), Some(util)) = (counter.Name, counter.UtilizationPercentage) {
            // Name usually like "pid_xxxx_luid_..._engine_..."
            // Extract the LUID part if possible as a key
            if let Some(luid_part) = name.split('_').find(|s| s.starts_with("luid")) {
                let current_util = utilization_map.entry(luid_part.to_string()).or_insert(0.0);
                *current_util += util as f64; // Sum utilization across engines for the same LUID
                // Clamping > 100% might be needed depending on counter definition
                if *current_util > 100.0 { *current_util = 100.0; }
            }
        }
    }

    log::debug!("Aggregated utilization via GPUEngine: {:?}", utilization_map);
    Ok(utilization_map)
}

fn estimate_power_usage(utilization: f64, name: &str) -> f64 {
    let base_power = 15.0; // Idle power estimate
    let scale_factor = if name.to_lowercase().contains("nvidia") {
        2.0 // Higher power scale for NVIDIA
    } else if name.to_lowercase().contains("amd") || name.to_lowercase().contains("radeon") {
        1.5 // Medium scale for AMD
    } else {
        0.5 // Lower scale for Intel/Unknown
    };
    (base_power + (utilization * scale_factor)).clamp(5.0, 350.0) // Clamp within reasonable bounds
}

fn estimate_temperature(utilization: f64) -> f64 {
    (40.0 + (utilization * 0.4)).clamp(30.0, 95.0) // Estimate based on load
}

// Implement From<wmi::WMIError> for MonitorError
impl From<wmi::WMIError> for MonitorError {
    fn from(err: wmi::WMIError) -> Self {
        MonitorError::GpuInfo(format!("WMI Error: {}", err))
    }
}