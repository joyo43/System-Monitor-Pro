// TauriViteReact/src-tauri/src/lib.rs (Corrected v8 - Add system-wide Disk I/O)

pub mod collectors;
pub mod models;
pub mod utils;

use models::{AppStateInner, DiskData, GpuData, NetworkData, SystemData, HISTORY_LENGTH}; // Added AppStateInner, HISTORY_LENGTH
use std::{collections::HashMap, time::Instant}; // Added Instant
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State, Wry};
// Corrected: Removed unused System and DiskUsage imports from this top level
use sysinfo::{CpuExt, CpuRefreshKind, PidExt, ProcessExt, ProcessRefreshKind, SystemExt}; // Added ProcessExt, kept SystemExt

const UPDATE_INTERVAL_MS: u64 = 1000;

// --- AppState definition using AppStateInner ---
pub struct AppState(Mutex<AppStateInner>);
impl Default for AppState { // Default for the wrapper
    fn default() -> Self { AppState(Mutex::new(AppStateInner::default())) }
}

// --- Define helper structs outside functions ---
#[derive(Debug)]
struct InitialData {
    cpu_usage: Vec<f64>,
    memory_used: f64,
    memory_total: f64,
    mem_percent_collected: f64,
    process_data_raw: Vec<(sysinfo::Pid, String, f32, u64)>,
}
#[derive(Debug)]
struct ComplexData {
    network_data: HashMap<String, NetworkData>,
    disk_data: HashMap<String, DiskData>,
    gpu_data: Vec<GpuData>,
}


#[tauri::command]
fn get_platform() -> Result<String, String> { /* ... same as before ... */ Ok(utils::get_platform_name()) }

#[tauri::command]
fn get_current_system_data(state: State<'_, AppState>) -> Result<SystemData, String> { /* ... same as before ... */
    log::debug!("Executing get_current_system_data command (runs fresh collection)");
     match state.0.lock() {
         Ok(mut app_state_guard) => {
             match collect_all_system_data_structured(&mut app_state_guard) {
                 Ok(data) => Ok(data),
                 Err(e) => {
                     let err_msg = format!("Failed to collect data for command: {}", e);
                     log::error!("{}", err_msg);
                     Err(err_msg)
                 }
             }
         },
         Err(poisoned) => {
              let err_msg = format!("Mutex poisoned in command: {}", poisoned);
              log::error!("{}", err_msg);
              Err(err_msg)
         }
     }
}


// --- Helper Function Definitions ---

// Phase 1: Refresh Sysinfo
fn refresh_sysinfo(state: &mut AppStateInner) {
    state.sys.refresh_networks_list();
    state.sys.refresh_disks_list();
    state.sys.refresh_cpu(); // Needed for usage calculation delta
    // Refresh processes with disk usage enabled
    state.sys.refresh_processes_specifics(ProcessRefreshKind::everything().with_disk_usage());
    state.sys.refresh_cpu_specifics(CpuRefreshKind::everything());
    state.sys.refresh_memory();
    // state.sys.refresh_processes(); // Already refreshed with specifics above
    state.sys.refresh_networks();
    state.sys.refresh_disks();
    log::trace!("Sysinfo refreshed (incl. process disk usage)");
}

// Phase 2: Collect initial data
fn collect_initial_data(
    state: &AppStateInner,
) -> Result<InitialData, Box<dyn std::error::Error + Send + Sync>> { /* ... same as before ... */
    let cpu_usage = collectors::cpu::collect_cpu_usage(&state.sys)?;
    let (memory_used, memory_total, mem_percent_collected) =
        collectors::memory::collect_memory_info(&state.sys)?;
    let process_data_raw = collectors::cpu::collect_process_info(&state.sys)?;
    Ok(InitialData {
        cpu_usage,
        memory_used,
        memory_total,
        mem_percent_collected,
        process_data_raw,
    })
}

// Phase 3: Update basic histories
fn update_basic_histories(
    initial_data: &InitialData,
    app_state: &mut AppStateInner,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> { /* ... same as before ... */
    collectors::cpu::update_cpu_history(&initial_data.cpu_usage, &mut app_state.cpu_history)?;
    collectors::memory::update_memory_history(
        initial_data.mem_percent_collected,
        &mut app_state.memory_history,
    )?;
    Ok(())
}

// Phase 4: Collect complex data
fn collect_complex_data(
    app_state: &mut AppStateInner,
    initial_data: &InitialData,
    now_instant: std::time::Instant,
) -> Result<ComplexData, Box<dyn std::error::Error + Send + Sync>> { /* ... same as before ... */
    collectors::network::update_network_data(&app_state.sys, &mut app_state.network_state, now_instant)?;
    collectors::disk::collect_disk_data(&app_state.sys, &mut app_state.disk_state, now_instant)?;
    let gpu_data_vec = collectors::gpu::collect_gpu_data_entry(&app_state.sys, &initial_data.cpu_usage, &mut app_state.gpu_utilization_history)?;
    Ok(ComplexData { network_data: app_state.network_state.clone(), disk_data: app_state.disk_state.clone(), gpu_data: gpu_data_vec })
}

// --- NEW Phase: Collect and Update System-Wide Disk I/O ---
// Returns (read_kb_per_sec, write_kb_per_sec)
fn collect_and_update_system_disk_io(
    state: &mut AppStateInner,
    now_instant: Instant,
) -> (f64, f64) {
    let mut total_read_delta: u64 = 0;
    let mut total_write_delta: u64 = 0;

    // Iterate through processes and sum disk usage deltas
    for process in state.sys.processes().values() {
        let usage = process.disk_usage();
        total_read_delta += usage.read_bytes;
        total_write_delta += usage.written_bytes;
    }

    let mut read_kb_per_sec = 0.0;
    let mut write_kb_per_sec = 0.0;

    if let Some(last_time) = state.last_update_instant {
        let delta_time = now_instant.duration_since(last_time).as_secs_f64();
        if delta_time > 0.001 { // Avoid division by zero or tiny intervals
            read_kb_per_sec = (total_read_delta as f64 / delta_time) / 1024.0;
            write_kb_per_sec = (total_write_delta as f64 / delta_time) / 1024.0;

            // Update read history
            if state.system_disk_read_history.len() >= HISTORY_LENGTH {
                state.system_disk_read_history.remove(0);
            }
            state.system_disk_read_history.push(read_kb_per_sec);

            // Update write history
            if state.system_disk_write_history.len() >= HISTORY_LENGTH {
                state.system_disk_write_history.remove(0);
            }
            state.system_disk_write_history.push(write_kb_per_sec);

        } else {
            // Delta time too small, reuse last history value if available
             if let Some(&last_val) = state.system_disk_read_history.last() { if state.system_disk_read_history.len() >= HISTORY_LENGTH { state.system_disk_read_history.remove(0); } state.system_disk_read_history.push(last_val); } else if state.system_disk_read_history.is_empty() { state.system_disk_read_history.push(0.0); }
             if let Some(&last_val) = state.system_disk_write_history.last() { if state.system_disk_write_history.len() >= HISTORY_LENGTH { state.system_disk_write_history.remove(0); } state.system_disk_write_history.push(last_val); } else if state.system_disk_write_history.is_empty() { state.system_disk_write_history.push(0.0); }
        }
    } else {
        // First run, push 0 to history
         if state.system_disk_read_history.is_empty() { state.system_disk_read_history.push(0.0); }
         if state.system_disk_write_history.is_empty() { state.system_disk_write_history.push(0.0); }
    }

    // Update the last update time for the next calculation
    state.last_update_instant = Some(now_instant);

    (read_kb_per_sec, write_kb_per_sec)
}


// --- Main Data Collection Logic ---
fn collect_all_system_data_structured(
    state: &mut AppStateInner,
) -> Result<SystemData, Box<dyn std::error::Error + Send + Sync>> {
    let now_chrono = chrono::Local::now();
    let now_instant = std::time::Instant::now(); // Use consistent time for all updates in cycle

    // Phase 1: Refresh (Refreshes state.sys inside)
    refresh_sysinfo(state);

    // --- Calculate System Disk I/O early after process refresh ---
    let (sys_read_kbps, sys_write_kbps) =
        collect_and_update_system_disk_io(state, now_instant);
    // ---

    // Phase 2: Collect initial data (Uses refreshed state.sys)
    let initial_data = collect_initial_data(state)?;

    // Phase 3: Update basic histories (Needs &mut state for history fields)
    update_basic_histories(&initial_data, state)?;

    // Phase 4: Collect complex data (Needs &mut state for maps/history, uses state.sys)
    let complex_data = collect_complex_data(state, &initial_data, now_instant)?;

    // Phase 5: Convert process data for serialization
    let process_data_serializable: Vec<(u32, String, f32, u64)> = initial_data
        .process_data_raw
        .into_iter()
        .map(|(pid, name, cpu, mem)| (pid.as_u32(), name, cpu, mem))
        .collect();

    // Phase 6: Assemble and return the SystemData structure
    Ok(SystemData {
        cpu_usage: initial_data.cpu_usage.clone(),
        cpu_history: state.cpu_history.clone(),
        memory_used: initial_data.memory_used,
        memory_total: initial_data.memory_total,
        memory_history: state.memory_history.clone(),
        top_processes: process_data_serializable,
        network_data: complex_data.network_data,
        gpu_data: complex_data.gpu_data,
        disk_data: complex_data.disk_data, // Per-disk info (still no I/O here)
        timestamp: now_chrono,
        platform_name: utils::get_platform_name(),
        // --- NEW: Populate system-wide disk fields ---
        system_disk_read_per_sec: sys_read_kbps,
        system_disk_write_per_sec: sys_write_kbps,
        system_disk_read_history: state.system_disk_read_history.clone(),
        system_disk_write_history: state.system_disk_write_history.clone(),
        // --- End NEW ---
    })
}

// --- Background Monitoring Task ---
async fn monitoring_loop(app_handle: AppHandle<Wry>) { /* ... same as before ... */
    let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(UPDATE_INTERVAL_MS)); // Corrected: Use tokio interval
    log::info!("Monitoring loop starting (interval: {}ms).", UPDATE_INTERVAL_MS);
    loop {
        interval.tick().await;
        if let Some(app_state_mutex) = app_handle.try_state::<AppState>() {
            let system_data_result = {
                match app_state_mutex.0.lock() {
                    Ok(mut app_state_guard) => collect_all_system_data_structured(&mut *app_state_guard),
                    Err(poisoned) => { /* ... error handling ... */ Err(Box::new(std::io::Error::new( std::io::ErrorKind::Other, format!("Mutex poisoned: {}", poisoned), )) as Box<dyn std::error::Error + Send + Sync>) }
                }
            };
            match system_data_result {
                Ok(data) => {
                    log::debug!( // Updated log format
                        "Collected: CPU[0]={}%, Net:{} ({:.1}↓/{:.1}↑ KB/s), Disk:{} ({:.1}↓/{:.1}↑ KB/s)",
                        data.cpu_usage.first().map_or(0.0, |&v| (v * 10.0).round() / 10.0),
                        data.network_data.len(),
                        data.network_data.values().map(|n| n.current_rx_speed).sum::<f64>(), // Sum rx speeds
                        data.network_data.values().map(|n| n.current_tx_speed).sum::<f64>(), // Sum tx speeds
                        data.disk_data.len(),
                        data.system_disk_read_per_sec,  // Log new system-wide value
                        data.system_disk_write_per_sec // Log new system-wide value
                    );
                    if let Err(e) = app_handle.emit("system-update", &data) { /* ... error handling ... */ log::error!("Failed to emit system-update event: {}", e); }
                }
                Err(e) => { /* ... error handling ... */
                    log::error!("Error collecting system data in loop: {}", e);
                    let error_payload = format!("Data collection failed: {}", e);
                    if let Err(emit_err) = app_handle.emit("backend-error", &error_payload) { log::error!("Failed to emit backend-error event: {}", emit_err); }
                 }
            }
        } else { /* ... warning ... */ log::warn!("AppState not available in monitoring loop..."); tokio::time::sleep(tokio::time::Duration::from_secs(5)).await; } // Corrected: use tokio sleep
    }
}


// --- Tauri Application Setup and Run (Keep using std::thread::spawn) ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() { /* ... same as before, ensures std::thread::spawn is used ... */
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis().init();
    log::info!("Starting System Monitor Pro Tauri Backend Setup");
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            log::info!("Running Tauri setup hook...");
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime for monitoring thread");
                rt.block_on(async move { monitoring_loop(app_handle).await; });
                 log::info!("Monitoring thread (std::thread) finished block_on.");
            });
            log::info!("Monitoring task/thread spawned.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ get_platform, get_current_system_data ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}