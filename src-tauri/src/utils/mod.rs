// TauriViteReact/src-tauri/src/utils/mod.rs (Corrected)

// Make modules public
pub mod error;
pub mod formatting;

// Re-export common items for easier access
pub use error::{MonitorError, Result}; // Correctly re-export from the error module
pub use formatting::{
    format_speed,
    format_bytes, // Re-export other non-eframe helpers if needed
    format_duration, // Re-export other non-eframe helpers if needed
    get_platform_name, // Re-export this function
};

// REMOVED eframe-dependent re-exports: cpu_color, memory_color, temperature_color