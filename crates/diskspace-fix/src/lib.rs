// The main diskspace crate functionality

// Core diskspace functionality that we've fixed
mod ds {
    use std::path::Path;
    use std::io::Error as IoError;

    pub fn get_path_size(path: &Path) -> Result<u64, IoError> {
        if path.is_file() {
            return get_file_size(path);
        }
        
        let mut total_size: u64 = 0;
        
        if let Ok(entries) = path.read_dir() {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                
                if path.is_file() {
                    if let Ok(size) = get_file_size(&path) {
                        total_size += size;
                    }
                } else if path.is_dir() {
                    if let Ok(size) = get_path_size(&path) {
                        total_size += size;
                    }
                }
            }
        }
        
        Ok(total_size)
    }

    pub fn get_file_size(path: &Path) -> Result<u64, IoError> {
        // FIX: Handle both Ok and Err cases properly
        let filesize = match path.metadata() {
            Err(e) => {
                return Err(e);
            },
            Ok(metadata) => metadata.len(), // This line fixes the issue
        };
        
        Ok(filesize)
    }
}

// Re-export the fixed functions
pub use ds::get_path_size;
pub use ds::get_file_size;

// Use external module files for platform-specific code
#[cfg(unix)]
pub mod unix;
#[cfg(windows)]
pub mod windows;
