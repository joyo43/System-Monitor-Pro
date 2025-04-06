// TauriViteReact/src-tauri/src/utils/error.rs
use std::fmt;
use std::error::Error;

/// Custom error type for the application
#[derive(Debug)]
pub enum MonitorError { // Ensure this name matches imports
    SystemInfo(String),
    GpuInfo(String),
    NetworkInfo(String),
    DiskInfo(String),
    IoError(std::io::Error),
    Other(String),
}

impl fmt::Display for MonitorError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MonitorError::SystemInfo(msg) => write!(f, "System info error: {}", msg),
            MonitorError::GpuInfo(msg) => write!(f, "GPU info error: {}", msg),
            MonitorError::NetworkInfo(msg) => write!(f, "Network info error: {}", msg),
            MonitorError::DiskInfo(msg) => write!(f, "Disk info error: {}", msg),
            MonitorError::IoError(err) => write!(f, "I/O error: {}", err),
            MonitorError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl Error for MonitorError {
     fn source(&self) -> Option<&(dyn Error + 'static)> {
         match *self {
             MonitorError::IoError(ref err) => Some(err),
             _ => None,
         }
     }
}

// Define a standard Result type Alias for the application
pub type Result<T> = std::result::Result<T, MonitorError>; // Ensure this Result is pub

// Optional: Helper function previously used
// pub fn log_error(error: &MonitorError) { ... }
// pub fn to_monitor_error<E: Error + Send + Sync + 'static>(e: E, context: &str) -> MonitorError { ... }

impl From<std::io::Error> for MonitorError {
    fn from(err: std::io::Error) -> MonitorError {
        MonitorError::IoError(err)
    }
}

// Add other From impls if needed (e.g., for NvmlError if using nvml-wrapper)
// impl From<nvml_wrapper::error::NvmlError> for MonitorError { ... }