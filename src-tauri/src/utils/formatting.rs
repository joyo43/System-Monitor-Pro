// TauriViteReact/src-tauri/src/utils/formatting.rs (Corrected)

// Removed eframe import
// use eframe::epaint::Color32; // <-- REMOVED

use std::time::Duration; // Keep if format_duration is used

// Ensure helper functions are public if used outside this module
pub fn format_speed(kbs: f64) -> String {
    if kbs.abs() < 1024.0 {
        format!("{:.1} KB/s", kbs)
    } else {
        format!("{:.1} MB/s", kbs / 1024.0)
    }
}

pub fn format_duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

pub fn format_bytes(bytes: u64) -> String {
    const KIB: f64 = 1024.0;
    const MIB: f64 = KIB * 1024.0;
    const GIB: f64 = MIB * 1024.0;
    const TIB: f64 = GIB * 1024.0;

    let bytes_f = bytes as f64;

    if bytes_f < KIB {
        format!("{} B", bytes)
    } else if bytes_f < MIB {
        format!("{:.1} KB", bytes_f / KIB)
    } else if bytes_f < GIB {
        format!("{:.1} MB", bytes_f / MIB)
    } else if bytes_f < TIB {
        format!("{:.1} GB", bytes_f / GIB)
    } else {
        format!("{:.1} TB", bytes_f / TIB)
    }
}

// Ensure this is public
pub fn get_platform_name() -> String {
    if cfg!(target_os = "windows") {
        "Windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macOS".to_string()
    } else if cfg!(target_os = "linux") {
        "Linux".to_string()
    } else {
        "Unknown OS".to_string()
    }
}

// REMOVED eframe-dependent color functions:
// cpu_color, memory_color, temperature_color