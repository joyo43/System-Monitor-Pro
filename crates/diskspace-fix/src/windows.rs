use std::path::Path;

#[derive(Debug)]
pub struct DiskInfo {
    pub filesystem: String,
    pub size: u64,
    pub used: u64,
    pub avail: u64,
    pub use_percent: f32,
    pub mounted_on: String,
}

pub fn disk_usage() -> Vec<DiskInfo> {
    // Simple implementation since we just need this to compile
    Vec::new()
}

pub fn disk_usage_on(_path: &Path) -> Option<DiskInfo> {
    // Simple implementation since we just need this to compile
    None
}