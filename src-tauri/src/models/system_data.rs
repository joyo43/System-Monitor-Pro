// TauriViteReact/src-tauri/src/models/system_data.rs (Add System-Wide Disk I/O)

use chrono::{DateTime, Local};
use serde::Serialize;
use std::collections::HashMap;
use std::time::Instant; // Keep Instant for internal state
use sysinfo::{System, SystemExt}; // Import System and SystemExt from sysinfo crate

pub const HISTORY_LENGTH: usize = 100;

// --- DiskData remains unchanged regarding I/O fields ---
#[derive(Serialize, Clone, Debug)]
pub struct DiskData {
    pub name: String,
    pub mount_point: String,
    pub disk_type: String,
    pub total_space: f64,
    pub used_space: f64,
    pub used_percentage: f64,
    pub read_bytes_per_sec: f64,  // Will remain 0
    pub write_bytes_per_sec: f64, // Will remain 0
    pub read_history: Vec<f64>,   // Will remain empty
    pub write_history: Vec<f64>,  // Will remain empty
    #[serde(skip)]
    pub last_update_time: Option<Instant>, // Still used internally by collector
    // Add fields to track previous read/write bytes
    #[serde(skip)]
    pub last_read_bytes: Option<u64>,
    #[serde(skip)]
    pub last_write_bytes: Option<u64>,
}

impl DiskData {
    pub fn new(
        name: String,
        mount_point: String,
        disk_type: String,
        total_space: f64,
        used_space: f64,
    ) -> Self {
        let used_percentage = if total_space > 0.0 {
            (used_space / total_space) * 100.0
        } else {
            0.0
        };
        DiskData {
            name, mount_point, disk_type, total_space, used_space, used_percentage,
            read_bytes_per_sec: 0.0, // Initialize to 0
            write_bytes_per_sec: 0.0, // Initialize to 0
            read_history: Vec::with_capacity(HISTORY_LENGTH), // Initialize empty
            write_history: Vec::with_capacity(HISTORY_LENGTH), // Initialize empty
            last_update_time: None,
            last_read_bytes: None,
            last_write_bytes: None,
        }
    }

    // update_io_and_history method is no longer called from the collector,
    // but we can leave it here if needed elsewhere later.
    // pub fn update_io_and_history(...) { ... }
}


// --- NetworkData remains unchanged ---
#[derive(Serialize, Clone, Debug, Default)]
pub struct NetworkData {
    pub rx_history: Vec<f64>,
    pub tx_history: Vec<f64>,
    pub current_rx_speed: f64,
    pub current_tx_speed: f64,
    #[serde(skip)]
    pub last_rx_bytes: u64,
    #[serde(skip)]
    pub last_tx_bytes: u64,
    #[serde(skip)]
    pub last_update_time: Option<Instant>,
}
impl NetworkData {
     pub fn new() -> Self { Default::default() }
     pub fn update(&mut self, current_rx_bytes: u64, current_tx_bytes: u64, now: Instant) {
         if let Some(last_time) = self.last_update_time {
             let delta_time = now.duration_since(last_time).as_secs_f64();
             if delta_time > 0.001 {
                 let delta_rx = current_rx_bytes.saturating_sub(self.last_rx_bytes);
                 let delta_tx = current_tx_bytes.saturating_sub(self.last_tx_bytes);
                 self.current_rx_speed = (delta_rx as f64 / delta_time) / 1024.0; // KB/s
                 self.current_tx_speed = (delta_tx as f64 / delta_time) / 1024.0; // KB/s
                 if self.rx_history.len() >= HISTORY_LENGTH { self.rx_history.remove(0); }
                 self.rx_history.push(self.current_rx_speed);
                 if self.tx_history.len() >= HISTORY_LENGTH { self.tx_history.remove(0); }
                 self.tx_history.push(self.current_tx_speed);
             } else {
                 // Avoid pushing zeros if delta_time is too small, reuse last value
                 if let Some(&last_val) = self.rx_history.last() { if self.rx_history.len() >= HISTORY_LENGTH { self.rx_history.remove(0); } self.rx_history.push(last_val); } else if self.rx_history.is_empty() { self.rx_history.push(0.0); }
                 if let Some(&last_val) = self.tx_history.last() { if self.tx_history.len() >= HISTORY_LENGTH { self.tx_history.remove(0); } self.tx_history.push(last_val); } else if self.tx_history.is_empty() { self.tx_history.push(0.0); }
             }
         } else {
             // First update
             if self.rx_history.is_empty() { self.rx_history.push(0.0); }
             if self.tx_history.is_empty() { self.tx_history.push(0.0); }
         }
         self.last_rx_bytes = current_rx_bytes;
         self.last_tx_bytes = current_tx_bytes;
         self.last_update_time = Some(now);
     }
}


// --- GpuData remains unchanged ---
#[derive(Serialize, Clone, Debug)]
pub struct GpuData {
    pub name: String,
    pub utilization: f64,
    pub temperature: f64,
    pub memory_used: f64,
    pub memory_total: f64,
    pub power_usage: f64,
    pub utilization_history: Vec<f64>,
}


// --- SystemData: Add fields for system-wide disk I/O ---
#[derive(Serialize, Clone, Debug, Default)]
pub struct SystemData {
    pub cpu_usage: Vec<f64>,
    pub cpu_history: Vec<Vec<f64>>,
    pub memory_used: f64,
    pub memory_total: f64,
    pub memory_history: Vec<f64>,
    pub top_processes: Vec<(u32, String, f32, u64)>,
    pub network_data: HashMap<String, NetworkData>,
    pub gpu_data: Vec<GpuData>,
    pub disk_data: HashMap<String, DiskData>, // Per-disk info (no I/O rates/history)
    pub timestamp: DateTime<Local>,
    pub platform_name: String,

    // --- NEW Fields ---
    pub system_disk_read_per_sec: f64, // System-wide disk read KB/s
    pub system_disk_write_per_sec: f64, // System-wide disk write KB/s
    pub system_disk_read_history: Vec<f64>, // History of system_disk_read_per_sec
    pub system_disk_write_history: Vec<f64>, // History of system_disk_write_per_sec
    // --- End NEW Fields ---
}


// --- AppStateInner: Add history vectors for system-wide disk I/O ---
// --- Keep the rest as it was from previous step ---
#[derive(Debug)]
pub struct AppStateInner {
    pub sys: sysinfo::System,
    pub cpu_history: Vec<Vec<f64>>,
    pub memory_history: Vec<f64>,
    pub gpu_utilization_history: HashMap<String, Vec<f64>>,
    pub network_state: HashMap<String, NetworkData>,
    pub disk_state: HashMap<String, DiskData>,
    // --- NEW Fields ---
    pub system_disk_read_history: Vec<f64>, // History for system-wide read rate
    pub system_disk_write_history: Vec<f64>, // History for system-wide write rate
    pub last_update_instant: Option<Instant>, // To calculate delta time for rates
    // --- End NEW Fields ---
}

impl Default for AppStateInner {
    fn default() -> Self {
        log::debug!("Initializing AppStateInner with new System");
        AppStateInner {
            sys: {
                let mut system = System::new();
                system.refresh_all();
                system
            },
            cpu_history: Vec::new(),
            memory_history: Vec::new(),
            gpu_utilization_history: HashMap::new(),
            network_state: HashMap::new(),
            disk_state: HashMap::new(),
            // --- NEW Fields Init ---
            system_disk_read_history: Vec::with_capacity(HISTORY_LENGTH),
            system_disk_write_history: Vec::with_capacity(HISTORY_LENGTH),
            last_update_instant: None,
            // --- End NEW Fields Init ---
        }
    }
}


// Tab enum might not be needed in backend unless commands use it
#[derive(Serialize, PartialEq, Clone, Copy, Debug)]
pub enum Tab {
    Overview, Cpu, Memory, Network, Processes, Gpu, Disk,
}