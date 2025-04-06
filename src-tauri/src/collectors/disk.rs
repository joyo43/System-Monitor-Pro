// TauriViteReact/src-tauri/src/collectors/disk.rs (Enhanced with disk I/O history)

use crate::models::{DiskData, HISTORY_LENGTH};
use crate::utils::error::Result;
use std::collections::HashMap;
use std::time::Instant;
use sysinfo::{DiskExt, DiskKind, System, SystemExt};

pub fn collect_disk_data(
    system: &System,
    disk_data_map: &mut HashMap<String, DiskData>,
    now: Instant,
) -> Result<()> {
    // Log the raw disks found by sysinfo *before* processing
    let disks_list = system.disks();
    log::debug!("Sysinfo detected {} disks before processing.", disks_list.len());

    // If the list is empty, log it and clear the map
    if disks_list.is_empty() {
        log::debug!("Disk list from sysinfo is empty. Clearing disk_data_map.");
        disk_data_map.clear();
        return Ok(()); // Not an error, just no disks detected
    }

    let mut current_disk_names = Vec::new(); // Keep track of names we actually process

    // Collect system-wide I/O stats (total of all disks) - Corrected: prefix unused variables
    let mut _total_read_bytes_per_sec = 0.0;
    let mut _total_write_bytes_per_sec = 0.0;

    for disk in disks_list {
        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let kind = disk.kind();
        let total_space = disk.total_space();
        let available_space = disk.available_space();

        // Log details for *every* disk found by sysinfo
        log::trace!(
            "Processing disk: Name='{}', Kind='{:?}', Mount='{}', Total={}B, Available={}B",
            name,
            kind,
            mount_point,
            total_space,
            available_space
        );

        // --- Optional Filtering ---
        // You could add filters here if needed, e.g.:
        // if name.is_empty() { log::trace!("Skipping disk with empty name."); continue; }
        // if mount_point.starts_with("/snap") { log::trace!("Skipping snap mount point: {}", mount_point); continue; }
        // if disk.is_removable() { log::trace!("Skipping removable disk: {}", name); continue; }
        // --------------------------

        current_disk_names.push(name.clone()); // Add name to list of *processed* disks

        let disk_type_str = match kind {
            DiskKind::HDD => "HDD".to_string(),
            DiskKind::SSD => "SSD".to_string(),
            DiskKind::Unknown(_) => "Unknown".to_string(),
        };

        let total_bytes = total_space;
        let available_bytes = available_space;
        let used_bytes = total_bytes.saturating_sub(available_bytes);

        let total_gb = total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        let used_gb = used_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        // Since current sysinfo doesn't expose I/O methods directly on Disk
        // We'll use a simulated approach for demo purposes - can be replaced with real
        // disk stats when sysinfo adds direct support for this

        // Using disk_io_counters would be more accurate in a real implementation
        // For now, let's generate some simulated I/O activity based on disk usage
        // This is only for demo/testing - replace with actual metrics in production

        // Check if this is the first entry in our tracking map
        let entry = disk_data_map.entry(name.clone()).or_insert_with(|| {
            log::debug!("Adding new entry for disk: {}", name);
            let mut disk_data = DiskData::new(
                name.clone(),
                mount_point.clone(),
                disk_type_str.clone(),
                total_gb,
                used_gb,
            );

            // Initialize with zeros
            disk_data.read_bytes_per_sec = 0.0;
            disk_data.write_bytes_per_sec = 0.0;

            disk_data
        });

        // Update existing entry's stats
        entry.total_space = total_gb;
        entry.used_space = used_gb;
        entry.disk_type = disk_type_str;
        entry.mount_point = mount_point;
        entry.used_percentage = if total_gb > 0.0 { (used_gb / total_gb) * 100.0 } else { 0.0 };

        // Simulate read/write activity based on disk usage and random fluctuation
        // In a production app, replace this with actual disk I/O metrics
        // For now, generate some data for testing the history charts
        let activity_factor = entry.used_percentage / 100.0 * 10.0; // base activity on disk usage %

        if let Some(last_time) = entry.last_update_time {
            let delta_time = now.duration_since(last_time).as_secs_f64();
            if delta_time > 0.001 {
                // Generate some simulated I/O rates - replace with real metrics when available
                let read_rate = activity_factor * (1.0 + (now.elapsed().as_millis() as f64 % 50.0) / 10.0);
                let write_rate = activity_factor * 0.8 * (1.0 + (now.elapsed().as_millis() as f64 % 60.0) / 12.0);

                // Apply smoothing with previous values if available
                if entry.read_history.is_empty() {
                    entry.read_bytes_per_sec = read_rate;
                    entry.write_bytes_per_sec = write_rate;
                } else {
                    // Add some smoothing
                    entry.read_bytes_per_sec = entry.read_bytes_per_sec * 0.7 + read_rate * 0.3;
                    entry.write_bytes_per_sec = entry.write_bytes_per_sec * 0.7 + write_rate * 0.3;
                }

                // Add to total for system-wide stats - Corrected: prefix unused variables
                _total_read_bytes_per_sec += entry.read_bytes_per_sec;
                _total_write_bytes_per_sec += entry.write_bytes_per_sec;
            }
        } else {
            // First time update, initialize with some small value
            entry.read_bytes_per_sec = activity_factor;
            entry.write_bytes_per_sec = activity_factor * 0.5;

            // Add to total for system-wide stats - Corrected: prefix unused variables
            _total_read_bytes_per_sec += entry.read_bytes_per_sec;
            _total_write_bytes_per_sec += entry.write_bytes_per_sec;
        }

        // Update I/O history
        if entry.read_history.len() >= HISTORY_LENGTH {
            entry.read_history.remove(0);
        }
        entry.read_history.push(entry.read_bytes_per_sec);

        if entry.write_history.len() >= HISTORY_LENGTH {
            entry.write_history.remove(0);
        }
        entry.write_history.push(entry.write_bytes_per_sec);

        // Update timestamp for next delta calculation
        entry.last_update_time = Some(now);
    }

    // Remove disks from map that are no longer *processed* (e.g., if filtered out)
    disk_data_map.retain(|name, _| current_disk_names.contains(name));
    log::debug!("Disk data map finalized with {} entries.", disk_data_map.len());

    Ok(())
}