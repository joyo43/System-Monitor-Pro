# System Monitor Pro

<div align="center">

![System Monitor Pro Logo](public/tauri.svg)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Built%20with-Tauri-blueviolet)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)

**A powerful, lightweight, and modern system monitoring application**

[Features](#features) • [Screenshots](#screenshots) • [Installation](#installation) • [Development](#development) • [Contributing](#contributing) • [License](#license)

</div>

## Overview

System Monitor Pro is a high-performance desktop application that provides real-time insights into your system's resources. Built with Rust, Tauri, and React, it combines the speed and efficiency of native code with a beautiful, responsive user interface.

![System Monitor Pro Screenshot](public/screenshot.png)

## Features

### 🚀 Performance

- **Ultra-Lightweight** - Uses minimal system resources (<1% CPU, <50MB RAM)
- **Native Performance** - Rust backend for rapid data collection and processing
- **Instant Startup** - Loads in under 2 seconds on most systems

### 💻 System Monitoring

- **CPU Metrics**
  - Usage per core and overall
  - Temperature monitoring
  - Frequency scaling
  - Process distribution

- **Memory Analysis**
  - RAM usage and available memory
  - Swap utilization
  - Memory-intensive processes
  - Memory type and speed details

- **Storage Insights**
  - Disk activity (reads/writes)
  - Partition usage
  - I/O performance metrics
  - Smart status (if available)

- **Network Activity**
  - Upload/download speeds
  - Connection statistics
  - Bandwidth usage by application
  - Network interface details

- **GPU Monitoring**
  - Utilization and temperature
  - VRAM usage
  - Core/memory clock speeds
  - Driver information

- **Process Management**
  - Running processes and resource usage
  - Process priority adjustment
  - Startup impact analysis

### 🎨 User Experience

- **Modern Interface** - Clean, intuitive design built with React and Tailwind CSS
- **Customizable Dashboard** - Arrange and select metrics that matter most to you
- **Theme Support** - Light, dark, and system themes
- **History Tracking** - Visual graphs showing resource usage over time
- **Smart Alerts** - Optional notifications for resource thresholds
- **Localization** - Support for multiple languages

## Screenshots

<div align="center">
Visit our <a href="https://joyo43.github.io/system-monitor-pro/" target="_blank">official website</a> to see screenshots and learn more about System Monitor Pro.
</div>

## Installation

### System Requirements
- Windows 10/11, macOS 10.15+, or Linux (with a modern desktop environment)
- 4GB RAM (8GB recommended)
- 100MB free disk space

### Download

**Visit our [official website](https://joyo43.github.io/system-monitor-pro/) to download System Monitor Pro for your platform.**

We provide builds for Windows, macOS, and Linux operating systems in various formats to suit your needs.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Rust](https://www.rust-lang.org/tools/install) (stable channel)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Environment Setup

Different platforms require specific dependencies:

#### Windows
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux
- Required packages:
  ```bash
  # Debian/Ubuntu
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  
  # Fedora
  sudo dnf install webkit2gtk4.0-devel \
    openssl-devel \
    gtk3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel
  
  # Arch Linux
  sudo pacman -S webkit2gtk \
    base-devel \
    openssl \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
  ```

### Building From Source

```bash
# Clone the repository
git clone https://github.com/joyo43/system-monitor-pro.git
cd system-monitor-pro

# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

The production build will create installers in the `src-tauri/target/release/bundle` directory.

### Troubleshooting Common Issues

- **Build errors related to Rust dependencies**: Try running `cargo clean` in the `src-tauri` directory.
- **Missing WebView2**: On Windows, ensure you've installed the WebView2 runtime.
- **Linux build failures**: Make sure you've installed all required development packages for your distribution.
- **Performance issues in dev mode**: This is normal - production builds are significantly more optimized.

## Project Structure

```
system-monitor-pro/
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── features/         # Redux slices
│   └── utils/            # Shared utilities
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── collectors/   # System data collectors
│   │   ├── models/       # Data structures
│   │   └── utils/        # Helper functions
│   └── Cargo.toml        # Rust dependencies
└── ...                   # Configuration files
```

## Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### Getting Started

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the [Rust style guide](https://doc.rust-lang.org/1.0.0/style/) for backend code
- Use [ESLint](https://eslint.org/) rules for frontend JavaScript/React code
- Write tests for new features when possible
- Update documentation to reflect changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - The framework enabling native performance with web technologies
- [React](https://react.dev/) - For the responsive UI library
- [Tailwind CSS](https://tailwindcss.com/) - For utility-first styling
- [Redux Toolkit](https://redux-toolkit.js.org/) - For state management
- [Framer Motion](https://www.framer.com/motion/) - For smooth animations
- [sysinfo](https://github.com/GuillaumeGomez/sysinfo) - The Rust system information library

---

<div align="center">
Made with ❤️ by joyo
  
[Report Bug](https://github.com/joyo/system-monitor-pro/issues) · [Request Feature](https://github.com/joyo/system-monitor-pro/issues) · [Website](https://joyo43.github.io/system-monitor-pro/)
</div>
