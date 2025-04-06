// TauriViteReact/src-tauri/src/main.rs
// (No changes needed from template if it calls lib::run)

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Ensure this matches the library name in src-tauri/Cargo.toml [lib].name
    system_monitor_pro_lib::run();
}