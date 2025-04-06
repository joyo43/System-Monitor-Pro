// TauriViteReact/src-tauri/src/collectors/mod.rs (Corrected v3)

// Make necessary modules public
pub mod cpu;
pub mod disk;
pub mod gpu;
pub mod memory;
pub mod network;
// pub mod processes; // <-- Ensure this line is REMOVED or commented out

// Platform-specific helpers should remain public if called from gpu.rs
#[cfg(target_os = "linux")]
pub mod linux_gpu_helpers;
#[cfg(target_os = "macos")]
pub mod macos_gpu_helpers;
#[cfg(target_os = "windows")]
pub mod windows_gpu_helpers;