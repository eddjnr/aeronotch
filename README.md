<p align="center">
  <img src="./public/logo.png" alt="AeroNotch Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">AeroNotch</h1>

<p align="center">
  Screen-top utility widget for Windows — media controls, system metrics, weather, calendar, microphone indicator, and file tray.
</p>

<p align="center">
  <a href="https://github.com/eddjnr/aeronotch/releases">
    <img src="https://img.shields.io/badge/Download-Latest_Release-051265?style=for-the-badge&logo=github" alt="Download" />
  </a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#license">License</a>
</p>

---

AeroNotch is a compact, always-visible desktop overlay for Windows. It sits at the top center of your screen and provides glanceable information and quick controls for music playback, hardware resource usage, weather, calendar events, and microphone mute state. All widgets are optional and can be toggled per-user preference.

---

<p align="center">
  <img width="1280" height="500" alt="demo aeronotch" src="https://github.com/user-attachments/assets/edac295d-0b21-40e3-a6a9-5d7851143dd3" />
</p>

## Features

### Media Player (SMTC)

- Reads the currently playing track via Windows `GlobalSystemMediaTransportControlsSessionManager` — works with Spotify, YouTube (Chrome/Edge/Firefox), Deezer, VLC, and other apps that register with SMTC.
- Displays title, artist, album art (base64-decoded and LRU-cached in Rust), playback position, and duration.
- Play/pause, next/previous, and drag-to-seek controls.
- Background poll loop emits `media-changed` events every 1s; only pushes updates on state change.

### System Monitor

- Real-time CPU usage (percent), memory usage (used/total), GPU name and utilization, disk usage per volume.
- Polls every 3 seconds via `sysinfo` crate on a background Rust thread.
- Displays in compact mode as a concise percentage string; expanded mode shows a bar chart breakdown.

### Weather

- Fetches current conditions from Open-Meteo (free, no API key required).
- Configurable location via latitude/longitude in settings.
- Shows temperature, apparent temperature (feels like), humidity, wind speed, and weather code mapped to descriptions/icons.

### Calendar

- Subscribes to any public iCal/ICS feed URL (Google Calendar, Outlook, Apple Calendar).
- Polls every 5 minutes; displays upcoming events for the current day in a compact list.

### Microphone Indicator

- Reads and toggles the mute state of the default Windows capture device via Core Audio API (`IMMDeviceEnumerator` / `IAudioEndpointVolume`).
- Polls every 500ms to detect external mute changes (hardware mute keys, Teams/Zoom toggle, etc.).
- Compact indicator + persistent header quick-action button for muting/unmuting during calls, regardless of the active tab.

### File Tray

- Drag-and-drop files or directories from Explorer onto the island to cache them in memory (persisted across restarts via zustand/persist).
- Copy to clipboard in native Windows format for `Ctrl+V` pasting, reveal in Explorer, or open with default application.
- Tray icon and count shown in compact mode; expanded view lists all files with drag-to-reorder.

### Preferences Panel

- Separate Tauri window with iOS-style grouped settings.
- Toggle individual widgets, adjust screen position (left/center/right), island opacity, language (en/pt-BR), monitor placement, and right-corner content (widgets or custom image).
- Settings sync across windows in real-time via Tauri events without restart.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri Window (transparent, top-center overlay)             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React (Vite + TypeScript)                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │  │
│  │  │ Island   │  │ Island   │  │ Preferences Panel  │  │  │
│  │  │ (layout) │  │Layout    │  │ (separate window)  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────────────────────┘  │  │
│  │       └──────┬──────┘                                 │  │
│  │       ┌──────┴──────┐                                 │  │
│  │       │  Widgets    │                                  │  │
│  │       │ (per-tab)   │                                  │  │
│  │       └─────────────┘                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ║  invoke() / events              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Rust (Tauri backend)                                │  │
│  │  ┌─────────┐ ┌──────┐ ┌────────┐ ┌────────┐         │  │
│  │  │ media   │ │ mic  │ │ system │ │weather │ ...      │  │
│  │  │ .rs     │ │ .rs  │ │ _info  │ │ .rs    │         │  │
│  │  │ (SMTC)  │ │(Core │ │ .rs    │ │(Open-  │         │  │
│  │  │         │ │Audio)│ │(sysinfo│ │ Meteo) │         │  │
│  │  └─────────┘ └──────┘ └────────┘ └────────┘         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Each feature module follows the same pattern:

1. **Rust module** (`src-tauri/src/*.rs`) — reads from the OS via Win32/Core Audio/sysinfo/HTTP and exposes `#[tauri::command]` functions.
2. **Background loop** (in `lib.rs` `setup()`) — repeatedly polls the Rust module on a spawned async task and emits Tauri events to the frontend.
3. **Frontend hook** (`src/hooks/use*.ts`) — listens to the Tauri event + fetches initial value on mount, writes to zustand store.
4. **Widget component** (`src/components/widgets/*.tsx`) — reads from store, renders per mode (`compact` / `preview` / `expanded`).
5. **Settings toggle** — boolean in `settings-store.ts` with a switch in `SettingsPanel.tsx`.

---

## Tech Stack

| Layer              | Technology                                           |
| ------------------ | ---------------------------------------------------- |
| Frontend framework | React 19, TypeScript                                 |
| Build / bundler    | Vite                                                 |
| Styling            | Tailwind CSS                                         |
| Animation          | Framer Motion (spring physics)                       |
| State management   | Zustand (with `persist` middleware)                  |
| Desktop runtime    | Tauri v2                                             |
| OS APIs (Windows)  | `windows` crate v0.58 (Win32, SMTC, Core Audio, COM) |
| System metrics     | `sysinfo` crate                                      |
| HTTP client        | `reqwest` (weather + calendar feed)                  |
| UI primitives      | Radix UI / shadcn/ui                                 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm: `npm install -g pnpm`
- Rust toolchain: [rustup.rs](https://rustup.rs/)
- Visual Studio Build Tools with C++ workload (required by Tauri)

### Install

```bash
pnpm install
```

### Development

Launches Vite dev server + Tauri debug window:

```bash
pnpm tauri dev
```

### Production Build

Generates an `.exe` installer and portable binary in `src-tauri/target/release/bundle/`:

```bash
pnpm tauri build
```

---

## License

MIT. See [LICENSE](LICENSE).
