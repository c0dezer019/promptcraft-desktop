# PromptCraft Desktop

Professional AI Prompt Engineering Suite - Desktop Application with Tauri

## Overview

PromptCraft Desktop is a powerful desktop application for AI prompt engineering. Built with Tauri (Rust + React), it provides advanced features including persistent storage, job queue management, and native OS integration.

## Features

### Core Features

- 🎬 **Video Generation**: Sora and Veo prompt builders
- 🎨 **Image Generation**: DALL-E, Grok, Midjourney, and Stable Diffusion
- 🔧 **ComfyUI/A1111 Support**: Visual workflow builder with node templates
- 🌓 **Dark Mode**: Eye-friendly interface
- 💾 **Export**: Save prompts as markdown, JSON, or workflow files
- 🎯 **Modifier Tags**: Organized categories for quick prompt enhancement

### Desktop-Specific Features

- 💿 **SQLite Database**: Persistent local storage for workflows and jobs
- 📁 **Native File Access**: Direct file system integration
- 🔔 **System Notifications**: Desktop alerts for job completion
- 🚀 **System Tray**: Quick access from menubar/taskbar
- ⚡ **Job Queue**: Manage multiple generation tasks
- 🔐 **Secure Storage**: API keys stored locally
- 📊 **Scene Management**: Organize prompts by project/scene
- 🔄 **Auto-Updates**: Seamless application updates

**Note on generating content**: This is a BYOK (Bring Your Own Key) for now. You'll need an API key with credits to generate videos, except for ComfyUI/A1111; you'll only need them installed and add your own checkpoint/models.

## Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable) - [Install Rust](https://rustup.rs/)
- **System Dependencies** (Linux):

  ```bash
  sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/c0dezer019/promptcraft-desktop.git
cd promptcraft-desktop

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri:dev

# Build for production
pnpm run tauri:build
```

## Usage

### Development

```bash
pnpm run dev          # Start frontend dev server only
pnpm run tauri:dev    # Start full Tauri dev environment
pnpm run build        # Build frontend
pnpm run tauri:build  # Build desktop application
```

### Production Build

The `tauri:build` command will create platform-specific installers:

- **Windows**: `.msi` and `.exe` in `src-tauri/target/release/bundle/`
- **macOS**: `.dmg` and `.app` in `src-tauri/target/release/bundle/`
- **Linux**: `.deb`, `.AppImage` in `src-tauri/target/release/bundle/`

## Architecture

### Frontend (React)

- React 18 with Vite
- Tailwind CSS for styling
- Lucide React for icons
- @promptcraft/ui component library

### Backend (Rust/Tauri)

- Tauri 2.x framework
- SQLite database with migrations
- Provider configuration management
- Job queue and workflow system
- Scene organization

### Database Schema

```sql
providers    - API provider configurations
jobs         - Generation job queue
workflows    - Saved workflow templates
scenes       - Project/scene organization
```

## Project Structure

```text
promptcraft-desktop/
├── src/                  # React frontend
│   ├── App.jsx          # Main application
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Tauri entry point
│   │   ├── commands.rs  # IPC commands
│   │   ├── db/          # Database layer
│   │   ├── generation/  # Generation logic
│   │   └── providers/   # Provider management
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   └── icons/           # Application icons
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Technologies

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Rust, Tauri 2.x
- **Database**: SQLite with rusqlite
- **IPC**: Tauri commands
- **UI Library**: @promptcraft/ui

## Platform Support

- ✅ Windows 10/11
- ✅ macOS 11+ (Big Sur and later)
- ✅ Linux (Ubuntu 20.04+, Debian 11+, and other distributions)

## Related Projects

- **[promptcraft-ui](https://github.com/c0dezer019/promptcraft-ui)** - Shared UI component library
- **[promptcraft-web](https://github.com/c0dezer019/promptcraft-web)** - Browser-based version

## Web Version

For a lightweight browser-based version without installation:
**[PromptCraft Web](https://c0dezer019.github.io/promptcraft-web)**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © PromptCraft

## Support

- **Issues**: [GitHub Issues](https://github.com/c0dezer019/promptcraft-desktop/issues)
- **Documentation**: See [promptcraft-ui](https://github.com/c0dezer019/promptcraft-ui) for component docs

## Roadmap

- [x] Add more support for different services like Runway, Luma, and Hailuo.
- [x] Add smarter selector for services and models.
- [ ] A more comprehensive settings menu.
- [ ] Options to install A1111 and/or ComfyUI directly from the app.
- [ ] ComfyUI/A1111 features.
  - [ ] Full management of A1111 and/or ComfyUI.
    - [ ] Adding/removing checkpoints, loras, etc.
    - [ ] Adjust settings.
  - [ ] ComfyUI webui/PromptCraft UI mode.
  - [ ] Storyboarding.
    - [ ] Probably a node workflow like ComfyUI.
  - [ ] Build workflows directly in-app.
- [ ] Scene documentation.
- [ ] Archive of previous generations produced in-app.
- [ ] Reloadable workflows/scenes for regeneration.
- [ ] About section
- [ ] User Manual
- [ ] Auto-updater
- [ ] Ability to purchase tokens for easier (and cheaper) generation of content across multiple services.
