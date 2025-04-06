// TauriViteReact/src-tauri/src/collectors/network.rs (Corrected Check + Enhanced Logging)

use crate::models::NetworkData;
use crate::utils::Result;
use std::collections::HashMap;
use std::time::Instant;
use sysinfo::{NetworkExt, NetworksExt, System, SystemExt};

pub fn update_network_data(
    system: &System,
    network_data_map: &mut HashMap<String, NetworkData>,
    now: Instant,
) -> Result<()> {
    // Log the raw networks found by sysinfo *before* processing
    let networks_list = system.networks();
    let network_count = networks_list.iter().count(); // Get count from iterator
    log::debug!("Sysinfo detected {} network interfaces before processing.", network_count);

    // Corrected check using the iterator count
    if network_count == 0 {
        log::debug!("Network list from sysinfo is empty. Clearing network_data_map.");
        network_data_map.clear();
        return Ok(()); // Not an error, just no interfaces detected
    }

    let mut current_interface_names = Vec::new(); // Keep track of names we actually process

    for (interface_name, data) in networks_list.iter() {
        let current_rx = data.received();
        let current_tx = data.transmitted();

        // Log details for *every* interface found by sysinfo
        log::trace!(
            "Processing interface: Name='{}', Received={}B, Transmitted={}B",
            interface_name,
            current_rx,
            current_tx
        );

        // --- Optional Filtering ---
        // Example: Skip loopback?
        // if interface_name == "lo" { log::trace!("Skipping loopback interface."); continue; }
        // --------------------------

        current_interface_names.push(interface_name.clone()); // Add name to list of *processed* interfaces

        let entry = network_data_map
            .entry(interface_name.clone())
            .or_insert_with(|| {
                log::debug!("Adding/Updating entry for network interface: {}", interface_name);
                NetworkData::new()
            });

        // Update the data (calculates speed based on previous state)
        entry.update(current_rx, current_tx, now);
    }

    // Remove interfaces from our map that no longer exist or were filtered out
    network_data_map.retain(|name, _| current_interface_names.contains(name));
    log::debug!("Network data map finalized with {} entries.", network_data_map.len());

    Ok(())
}