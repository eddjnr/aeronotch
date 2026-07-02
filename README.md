<p align="center">
  <img src="./public/logo.png" alt="AeroNotch Logo" width="120" height="120" style="border-radius: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);" />
</p>

<h1 align="center">AeroNotch</h1>

<p align="center">
  <strong>An elegant, fluid, and interactive Dynamic Island utility for Windows.</strong>
</p>

<p align="center">
  <a href="https://github.com/eddjnr/aeronotch/releases">
    <img src="https://img.shields.io/badge/Download-Latest_Release-051265?style=for-the-badge&logo=github" alt="Download Latest Release" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/eddjnr/aeronotch/releases">Download</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#design-philosophy">Design Philosophy</a> •
  <a href="#license">License</a>
</p>

---

AeroNotch brings the premium, organic feel of the iOS Dynamic Island straight to your Windows desktop. Designed as a bezel-integrated desktop overlay, it transitions smoothly between compact system metrics and expanded widgets, providing quick controls for music, system resource monitors, weather, and calendars—all with zero layout thrashing and high-performance physics.

---

<p align="center">
  <img width="1280" height="430" alt="demo aeronotch" src="https://github.com/user-attachments/assets/4dfa550d-1064-49d8-934f-440d379b2f14" />
</p>

## 🎨 Preview & Aesthetics

AeroNotch is built around Apple-like design principles:

- **Elastic Transitions**: Smooth, spring-based animations that bounce organically (the "jelly" effect).
- **Bezel-Integrated Unity**: Curves and position anchors that visually merge with the top edge of your physical screen bezel.
- **Glassmorphism**: Elegant dark translucent backgrounds with native window drop-shadows and subtle borders.

---

## ✨ Features

### 🎵 Music Widget (SMTC Integrated)

- **Real-time SMTC Sync**: Instantly displays track details, artist names, and album art from active Windows players (Spotify, YouTube, Chrome, etc.).
- **Interactive Drag-Seeking**: Drag and scrub the timeline slider to jump to any part of a song in real-time.
- **Responsive Equalizer**: A smooth, real-time vertical frequency wave that animates only when music is playing (using high-performance direct DOM painting).
- **Press States**: Elastically scaling play/pause/skip buttons with smooth morphing transitions.

### 📊 System Widget (Hardware Monitor)

- **Live Statistics**: Displays real-time CPU utilization, RAM usage, and battery percentages.
- **Low-Overhead Polling**: Backend Rust thread queries system APIs efficiently every 3 seconds to keep resource usage practically non-existent.

### ⛅ Weather Widget

- **Current Conditions**: Automatically fetches localized temperature, weather descriptions, and matches appropriate atmospheric icons.
- **Configurable Location**: Set custom coordinates (latitude & longitude) directly within the Preferences panel.

### 📅 Calendar & Clock Widgets

- **Quick Look**: A compact calendar widget showing current weekday, day, and month alongside a digital clock.

### 📁 File Tray Widget (Bandeja de Arquivos)

- **Drag-and-Drop Stash**: Drag any file or directory from Windows Explorer directly onto the Dynamic Island to cache it in memory. Auto-expands compact notches on hover.
- **Persistent Storage**: Cached files are retained across application restarts using a secure, local-storage state mechanism.
- **Clipboard Operations**: Copy files to your clipboard in native Windows format, allowing instant `Ctrl + V` pasting into Windows Explorer.
- **Quick Controls**: Double-click files to open them with default applications or click options to reveal folders in Explorer or remove them from memory.

### ⚙️ macOS-Style Preferences Panel

- **Sidebar Navigation**: Clean, native sidebar navigation with card-based options grouped in iOS-style rounded layouts.
- **Instant Settings Sync**: Tweak coordinates, hide/show widgets, adjust opacity, and toggle app behavior. Changes sync in real-time across Tauri windows without requiring restarts.
- **System Tray integration**: Right-click the custom AeroNotch tray icon in your Windows taskbar to access settings, show/hide the island, or exit.

---

## ⚡ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Radix UI / Shadcn
- **Backend**: Rust, Tauri v2
- **Natives / APIs**:
  - `windows-rs` (native Win32 SMTC media sync, volume controls, and global memory clipboard copier)
  - `sysinfo` (Rust-based ultra-fast system hardware metrics)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine for development and compilation.

### Prerequisites

1. **Node.js**: Make sure Node.js (v18+) is installed.
2. **PNPM**: Fast package manager used for frontend dependencies:
   ```bash
   npm install -g pnpm
   ```
3. **Rust & C++ Build Tools**: Because AeroNotch compiles native desktop code via Tauri, you need the Rust toolchain installed:
   - Install Rust via [rustup.rs](https://rustup.rs/).
   - Install Visual Studio Build Tools (ensure C++ Build Tools workload is checked).

### Installation

1. Clone the repository to your local directory.
2. Install the package dependencies:
   ```bash
   pnpm install
   ```

### Development

Launch the developer environment. This boots Vite for the frontend and compiles/runs the Tauri Rust window system in debug mode:

```bash
pnpm tauri dev
```

### Production Compilation

Build a highly optimized production bundle (`.exe` installer and portable binary):

```bash
pnpm tauri build
```

The compiled assets will be placed inside `src-tauri/target/release/bundle/`.

---

## 🧠 Design Philosophy

All code changes to AeroNotch strictly respect three core rules defined in our design specification (`PRODUCT.md`):

1. **Bezel-Integrated Unity**: The island must anchor to the top edge and use matching concave curves (`border-radius: 16px` for lower corners) so it feels like a physical part of the screen.
2. **Unobtrusive Interactivity**: Layout state changes must feel light. Hovering expands the island into compact widgets; clicking or play status toggles into detailed cards.
3. **Zero Layout Thrashing**: Resizing the native Windows window must wait for the React transition collapse animations to complete, preventing sharp black frame glitches.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
