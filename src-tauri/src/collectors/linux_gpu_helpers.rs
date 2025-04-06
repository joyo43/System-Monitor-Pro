#![cfg(target_os = "linux")] // Ensure this file only compiled on Linux

use crate::models::{GpuData, HISTORY_LENGTH};
use crate::utils::error::{MonitorError, Result};
use glob::glob;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::process::Command;

#[cfg(feature = "nvml-support")] // Ensure this matches Cargo.toml
use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, Nvml};

/// Collects NVIDIA GPU data using NVML (if feature enabled)
#[cfg(feature = "nvml-support")] // Ensure this matches Cargo.toml
pub fn collect_nvidia_gpu_data(
    nvml: &Nvml,
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<()> {
    let device_count = match nvml.device_count() {
        Ok(count) => count,
        Err(e) => {
            return Err(MonitorError::GpuInfo(format!(
                "NVML get device count failed: {}",
                e
            )));
        }
    };

    if device_count == 0 {
        return Ok(());
    }

    for i in 0..device_count {
        let device = match nvml.device_by_index(i) {
            Ok(dev) => dev,
            Err(_) => continue, // Try next device if one fails
        };

        let name = device
            .name()
            .unwrap_or_else(|_| format!("NVIDIA GPU {}", i));

        // Collect metrics, using 0.0 as default if a specific metric fails
        let utilization = device
            .utilization_rates()
            .map(|rates| rates.gpu as f64)
            .unwrap_or(0.0);

        let temperature = device
            .temperature(TemperatureSensor::Gpu)
            .map(|temp| temp as f64)
            .unwrap_or(0.0);

        let (memory_used_gb, memory_total_gb) = match device.memory_info() {
            Ok(mem) => (
                mem.used as f64 / 1_000_000_000.0, // Bytes to GB (1e9)
                mem.total as f64 / 1_000_000_000.0,
            ),
            Err(_) => (0.0, 0.0) // Default to 0 if error
        };

        let power_usage = device
            .power_usage()
            .map(|power| power as f64 / 1000.0) // mW to W
            .unwrap_or(0.0);

        // Update history
        let history = gpu_history
            .entry(name.clone())
            .or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
        if history.len() >= HISTORY_LENGTH {
            history.remove(0);
        }
        history.push(utilization.clamp(0.0, 100.0)); // Ensure clamped value

        gpu_data.push(GpuData {
            name,
            utilization: utilization.clamp(0.0, 100.0), // Ensure clamped value
            temperature,
            memory_used: memory_used_gb.max(0.0), // Ensure non-negative
            memory_total: memory_total_gb.max(0.0), // Ensure non-negative
            power_usage: power_usage.max(0.0), // Ensure non-negative
            utilization_history: history.clone(),
        });
    }
    Ok(())
}

/// Collects AMD/Intel GPU data using sysfs and commands
pub fn collect_amd_intel_gpu_data(
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
) -> Result<()> {
    let mut found_gpus = HashSet::new(); // Used internally by helpers

    // Try lspci first
    if let Ok(output) = Command::new("lspci").arg("-vmm").output() {
        if let Ok(output_str) = String::from_utf8(output.stdout) {
            parse_lspci_output(&output_str, gpu_data, gpu_history, &mut found_gpus);
        }
    }

    // Try sysfs if lspci didn't yield results
    if gpu_data.is_empty() {
        let _ = collect_sysfs_gpu_data(gpu_data, gpu_history, &mut found_gpus);
    }

    // Try helper commands if specific vendors still not found
    let current_gpu_names_lower: HashSet<String> = gpu_data.iter().map(|g| g.name.to_lowercase()).collect();

    if !current_gpu_names_lower.iter().any(|n| n.contains("amd") || n.contains("radeon"))
    {
        let _ = collect_radeontop_data(gpu_data, gpu_history, &mut found_gpus);
    }

    if !current_gpu_names_lower.iter().any(|n| n.contains("intel")) {
        let _ = collect_intel_gpu_top_data(gpu_data, gpu_history, &mut found_gpus);
    }

    Ok(())
}

// --- Helper functions ---

fn parse_lspci_output(
    output: &str,
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
    found_gpus: &mut HashSet<String>,
) {
    let mut current_gpu_info: Option<GpuData> = None;
    for line in output.lines() {
        if line.starts_with("Class:\tVGA compatible controller") || line.starts_with("Class:\t3D controller") {
            if let Some(gpu) = current_gpu_info.take() {
                if !gpu.name.is_empty() && !found_gpus.contains(&gpu.name) {
                    finalize_and_add_gpu(gpu, gpu_data, gpu_history, found_gpus);
                }
            }
            current_gpu_info = None;
        } else if line.starts_with("Device:") {
            let name = line.splitn(2, ':').nth(1).unwrap_or("Unknown").trim().to_string();
            if name.to_lowercase().contains("nvidia") { // Skip NVIDIA here
                current_gpu_info = None;
                continue;
            }
            let lower_name = name.to_lowercase();
            if (lower_name.contains("amd") || lower_name.contains("ati") || lower_name.contains("radeon") || lower_name.contains("intel")) && !found_gpus.contains(&name) {
                current_gpu_info = Some(GpuData { 
                    name: name.clone(), 
                    utilization: 0.0, 
                    temperature: 0.0, 
                    memory_used: 0.0, 
                    memory_total: 0.0, 
                    power_usage: 0.0, 
                    utilization_history: vec![], 
                });
            } else { 
                current_gpu_info = None; 
            } 
        }
        if line.trim().is_empty() { // Finalize block on empty line
            if let Some(gpu) = current_gpu_info.take() {
                if !gpu.name.is_empty() && !found_gpus.contains(&gpu.name) {
                    finalize_and_add_gpu(gpu, gpu_data, gpu_history, found_gpus);
                }
            }
        }
    }
    // Finalize last block if any
    if let Some(gpu) = current_gpu_info.take() {
        if !gpu.name.is_empty() && !found_gpus.contains(&gpu.name) {
            finalize_and_add_gpu(gpu, gpu_data, gpu_history, found_gpus);
        }
    }
}

fn finalize_and_add_gpu(
    mut gpu: GpuData,
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
    found_gpus: &mut HashSet<String>,
) {
    let history = gpu_history.entry(gpu.name.clone()).or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
    if history.len() >= HISTORY_LENGTH { history.remove(0); }
    history.push(gpu.utilization.clamp(0.0, 100.0));
    gpu.utilization_history = history.clone();

    found_gpus.insert(gpu.name.clone());
    gpu_data.push(gpu);
}

fn collect_sysfs_gpu_data(
    gpu_data: &mut Vec<GpuData>,
    gpu_history: &mut HashMap<String, Vec<f64>>,
    found_gpus: &mut HashSet<String>,
) -> Result<()> {
    let drm_path = "/sys/class/drm";
    if let Ok(entries) = fs::read_dir(drm_path) {
        for entry_result in entries {
            if let Ok(entry) = entry_result {
                let path = entry.path();
                if !(path.is_dir() && path.file_name().map_or(false, |n| n.to_string_lossy().starts_with("card")) && !path.file_name().map_or(false, |n| n.to_string_lossy().contains('-'))) { continue; }
                let device_path = path.join("device");
                let vendor_path = device_path.join("vendor");
                let dev_id_path = device_path.join("device");
                let vendor_id = fs::read_to_string(&vendor_path).map(|s| s.trim().to_lowercase()).ok();
                let device_id = fs::read_to_string(&dev_id_path).map(|s| s.trim().to_lowercase()).ok();

                let gpu_name; let mut is_amd = false; let mut is_intel = false;
                match vendor_id.as_deref() {
                    Some("0x1002") => { gpu_name = format!("AMD/ATI Radeon (sysfs {})", device_id.as_deref().unwrap_or("?")); is_amd = true; }
                    Some("0x8086") => { gpu_name = format!("Intel Graphics (sysfs {})", device_id.as_deref().unwrap_or("?")); is_intel = true; }
                    Some("0x10de") => { continue; } // Skip NVIDIA
                    _ => { continue; } // Skip unknown
                }

                if found_gpus.insert(gpu_name.clone()) { // Use insert's return value to check if new
                    let mut gpu_info = GpuData { 
                        name: gpu_name.clone(), 
                        utilization: 0.0, 
                        temperature: 0.0, 
                        memory_used: 0.0, 
                        memory_total: 0.0, 
                        power_usage: 0.0, 
                        utilization_history: vec![], 
                    };
                    let sysfs_base_path_str = device_path.to_string_lossy();
                    if is_amd { collect_amd_gpu_sysfs_data_for_path(&mut gpu_info, &sysfs_base_path_str); }
                    if is_intel { collect_intel_gpu_sysfs_data_for_path(&mut gpu_info, &sysfs_base_path_str); }
                    let history = gpu_history.entry(gpu_info.name.clone()).or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH));
                    if history.len() >= HISTORY_LENGTH { history.remove(0); }
                    history.push(gpu_info.utilization.clamp(0.0, 100.0));
                    gpu_info.utilization_history = history.clone();
                    gpu_data.push(gpu_info);
                }
            }
        }
    }
    Ok(())
}

fn collect_amd_gpu_sysfs_data_for_path(gpu_info: &mut GpuData, sysfs_base: &str) {
    if sysfs_base.is_empty() { return; }
    let hwmon_path_pattern = format!("{}/hwmon/hwmon*", sysfs_base);
    if let Some(temp_path) = find_sysfs_file(&hwmon_path_pattern, "temp*_input") { 
        if let Ok(temp_str) = fs::read_to_string(&temp_path) { 
            if let Ok(temp_milli_c) = temp_str.trim().parse::<f64>() { 
                gpu_info.temperature = temp_milli_c / 1000.0; 
            } 
        } 
    }
    let util_path = format!("{}/gpu_busy_percent", sysfs_base); 
    if let Ok(util_str) = fs::read_to_string(&util_path) { 
        if let Ok(util) = util_str.trim().parse::<f64>() { 
            gpu_info.utilization = util.clamp(0.0, 100.0); 
        } 
    }
    let vram_total_path = format!("{}/mem_info_vram_total", sysfs_base); 
    if let Ok(total_str) = fs::read_to_string(&vram_total_path) { 
        if let Ok(total_bytes) = total_str.trim().parse::<u64>() { 
            gpu_info.memory_total = total_bytes as f64 / (1e9); 
        } 
    }
    let vram_used_path = format!("{}/mem_info_vram_used", sysfs_base); 
    if let Ok(used_str) = fs::read_to_string(&vram_used_path) { 
        if let Ok(used_bytes) = used_str.trim().parse::<u64>() { 
            gpu_info.memory_used = (used_bytes as f64 / (1e9)).max(0.0); 
        } 
    }
    if let Some(power_path) = find_sysfs_file(&hwmon_path_pattern, "power1_average") { 
        if let Ok(power_str) = fs::read_to_string(&power_path) { 
            if let Ok(power_micro_w) = power_str.trim().parse::<u64>() { 
                gpu_info.power_usage = (power_micro_w as f64 / 1e6).max(0.0); 
            } 
        } 
    }
    // Apply defaults / estimations if values are missing or invalid
    if gpu_info.power_usage <= 0.0 && gpu_info.utilization > 0.0 { 
        gpu_info.power_usage = (20.0 + (gpu_info.utilization / 100.0) * 100.0).clamp(5.0, 300.0); 
    }
    if gpu_info.memory_total <= 0.0 { 
        gpu_info.memory_total = 1.0; 
    } 
    if gpu_info.memory_used > gpu_info.memory_total { 
        gpu_info.memory_used = gpu_info.memory_total; 
    }
    if gpu_info.temperature <= 0.0 && gpu_info.utilization > 0.0 { 
        gpu_info.temperature = (40.0 + (gpu_info.utilization / 100.0) * 40.0).clamp(20.0, 95.0); 
    }
}

fn collect_intel_gpu_sysfs_data_for_path(gpu_info: &mut GpuData, sysfs_base: &str) {
    if sysfs_base.is_empty() { return; }
    // Prioritize intel_gpu_top if available
    if collect_intel_gpu_top_data_single(gpu_info).is_ok() { return; }
    // Fallback: frequency check
    let freq_base_path = format!("{}/drm/card0", sysfs_base); // Needs refinement
    let cur_freq_path = find_sysfs_file(&freq_base_path, "gt_cur_freq_mhz"); 
    let max_freq_path = find_sysfs_file(&freq_base_path, "gt_max_freq_mhz");
    if let (Some(cur_path), Some(max_path)) = (cur_freq_path, max_freq_path) { 
        if let (Ok(cur_str), Ok(max_str)) = (fs::read_to_string(&cur_path), fs::read_to_string(&max_path)) { 
            if let (Ok(current_freq), Ok(max_freq)) = (cur_str.trim().parse::<f64>(), max_str.trim().parse::<f64>()) { 
                if max_freq > 0.0 { 
                    gpu_info.utilization = (current_freq / max_freq * 100.0).clamp(0.0, 100.0); 
                } 
            } 
        } 
    }
    // Fallback: Temperature (search thermal zones)
    if gpu_info.temperature <= 0.0 { 
        if let Ok(thermal_zones) = glob("/sys/class/thermal/thermal_zone*") { 
            for zone_entry in thermal_zones.filter_map(|r| r.ok()) { 
                if let Ok(type_str) = fs::read_to_string(zone_entry.join("type")) { 
                    if type_str.contains("pkg") { 
                        if let Ok(temp_str) = fs::read_to_string(zone_entry.join("temp")) { 
                            if let Ok(temp_milli_c) = temp_str.trim().parse::<f64>() { 
                                gpu_info.temperature = temp_milli_c / 1000.0; 
                                break; 
                            } 
                        } 
                    } 
                } 
            } 
        }
    }
    // Final fallback estimations
    if gpu_info.temperature <= 0.0 { 
        gpu_info.temperature = (40.0 + (gpu_info.utilization / 100.0) * 20.0).clamp(30.0, 95.0); 
    }
    gpu_info.memory_total = 1.5; 
    gpu_info.memory_used = (gpu_info.utilization / 100.0) * gpu_info.memory_total * 0.8;
    gpu_info.power_usage = (3.0 + (gpu_info.utilization / 100.0) * 12.0).clamp(2.0, 25.0);
}

fn collect_radeontop_data(
    gpu_data: &mut Vec<GpuData>, 
    gpu_history: &mut HashMap<String, Vec<f64>>, 
    found_gpus: &mut HashSet<String>,
) -> Result<()> {
    // Check if radeontop exists, but suppress its output
    let has_radeontop = Command::new("which")
        .arg("radeontop")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_or(false, |s| s.success());
        
    if has_radeontop {
        match Command::new("radeontop")
            .args(["-d", "-", "-l", "1"])
            .stderr(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .output() 
        {
            Ok(output) => { 
                if let Ok(output_str) = String::from_utf8(output.stdout) { 
                    if output_str.contains("gpu") { 
                        let name = "AMD Radeon (radeontop)".to_string(); 
                        if found_gpus.insert(name.clone()) { 
                            let mut gpu_info = GpuData { 
                                name: name.clone(), 
                                utilization: 0.0, 
                                temperature: 60.0, 
                                memory_used: 0.0, 
                                memory_total: 4.0, 
                                power_usage: 0.0, 
                                utilization_history: vec![] 
                            }; 
                            if let Some(gpu_idx) = output_str.find("gpu") { 
                                let potential_num = output_str[gpu_idx..].chars().skip(3).take_while(|&c| c.is_ascii_digit() || c == '.').collect::<String>(); 
                                if let Ok(util) = potential_num.trim().parse::<f64>() { 
                                    gpu_info.utilization = util.clamp(0.0, 100.0); 
                                    gpu_info.memory_used = (util / 100.0) * gpu_info.memory_total; 
                                } 
                            } 
                            let history = gpu_history.entry(gpu_info.name.clone()).or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH)); 
                            if history.len() >= HISTORY_LENGTH { 
                                history.remove(0); 
                            } 
                            history.push(gpu_info.utilization); 
                            gpu_info.utilization_history = history.clone(); 
                            gpu_data.push(gpu_info); 
                        } 
                    } 
                }
            },
            Err(_) => {}
        }
    }
    Ok(())
}

fn collect_intel_gpu_top_data(
    gpu_data: &mut Vec<GpuData>, 
    gpu_history: &mut HashMap<String, Vec<f64>>, 
    found_gpus: &mut HashSet<String>,
) -> Result<()> {
    let name = "Intel Graphics (intel_gpu_top)".to_string();
    let sysfs_name_pattern = "Intel Graphics (sysfs";
    if !found_gpus.iter().any(|n| n.starts_with(sysfs_name_pattern)) && !found_gpus.contains(&name) {
        let mut gpu_info = GpuData { 
            name: name.clone(), 
            utilization: 0.0, 
            temperature: 0.0, 
            memory_used: 0.0, 
            memory_total: 0.0, 
            power_usage: 0.0, 
            utilization_history: vec![] 
        };
        if collect_intel_gpu_top_data_single(&mut gpu_info).is_ok() {
            let history = gpu_history.entry(gpu_info.name.clone()).or_insert_with(|| Vec::with_capacity(HISTORY_LENGTH)); 
            if history.len() >= HISTORY_LENGTH { 
                history.remove(0); 
            } 
            history.push(gpu_info.utilization); 
            gpu_info.utilization_history = history.clone();
            found_gpus.insert(gpu_info.name.clone());
            gpu_data.push(gpu_info);
        }
    }
    Ok(())
}

fn collect_intel_gpu_top_data_single(gpu_info: &mut GpuData) -> Result<()> {
    // First, check if intel_gpu_top exists, but suppress its output
    let has_intel_gpu_top = Command::new("which")
        .arg("intel_gpu_top")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_or(false, |s| s.success());
        
    if has_intel_gpu_top {
        // Now run intel_gpu_top with all output redirected properly
        match Command::new("intel_gpu_top")
            .args(["-J", "-s", "1", "-o", "-"])
            .stderr(std::process::Stdio::null()) // Redirect stderr to null
            .stdout(std::process::Stdio::piped()) // Capture stdout but don't display
            .output() 
        {
            Ok(output) => { 
                // Process intel_gpu_top output
                if let Ok(output_str) = String::from_utf8(output.stdout) {
                    // Look for specific metrics in the output
                    if output_str.contains("engines") || output_str.contains("busy") {
                        for line in output_str.lines() {
                            if line.contains("render") && line.contains("busy") {
                                let parts: Vec<&str> = line.split(":").collect();
                                if parts.len() >= 2 {
                                    let value_part = parts[1].trim().trim_matches(|c| c == ',' || c == '"' || c == '%');
                                    if let Ok(util) = value_part.parse::<f64>() {
                                        gpu_info.utilization = util.clamp(0.0, 100.0);
                                        
                                        // Estimate other values based on utilization
                                        gpu_info.memory_total = 2.0; // Estimate total memory for Intel GPU
                                        gpu_info.memory_used = (util / 100.0) * gpu_info.memory_total * 0.7;
                                        gpu_info.power_usage = (5.0 + (util / 100.0) * 15.0).clamp(3.0, 30.0);
                                        gpu_info.temperature = (40.0 + (util / 100.0) * 25.0).clamp(35.0, 90.0);
                                        
                                        return Ok(());
                                    }
                                }
                            }
                        }
                    }
                }
                Err(MonitorError::GpuInfo("Failed to parse intel_gpu_top output".into()))
            },
            Err(e) => { 
                return Err(MonitorError::GpuInfo(format!("Failed to execute intel_gpu_top: {}", e))); 
            }
        }
    } else { 
        return Err(MonitorError::GpuInfo("intel_gpu_top not found".into())); 
    }
}

fn find_sysfs_file(dir_pattern: &str, file_pattern: &str) -> Option<String> {
    if let Ok(dirs) = glob(dir_pattern) {
        for dir_entry_result in dirs {
            if let Ok(dir_entry) = dir_entry_result {
                let file_path_pattern = format!("{}/{}", dir_entry.display(), file_pattern);
                if let Ok(mut files) = glob(&file_path_pattern) {
                    if let Some(Ok(file_path)) = files.next() {
                        return Some(file_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    None
}