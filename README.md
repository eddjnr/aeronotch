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

## Plugin System

AeroNotch features a dynamic plugin system that allows extending the island with new integrations and widgets on the fly. Plugins are compiled into stand-alone ES modules and loaded dynamically via `blob:` URLs inside WebView2.

### Manifest Configuration (`manifest.json`)

Every plugin must contain a `manifest.json` file in its root:

```json
{
  "id": "my-plugin",
  "name": "My Custom Widget",
  "version": "1.0.0",
  "description": "Monitors custom APIs and shows a compact widget.",
  "author": "YourName",
  "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z", // SVG path
  "entry": "index.js", // Background entry script (polling / API loops)
  "ui": {
    "compact": "compact.js",   // Renders inside the compact island taskbar
    "expanded": "expanded.js", // Renders in the island's expanded panel
    "settings": "settings.js"  // Renders in the settings window tab
  }
}
```

### The Plugin SDK (`@aeronotch/plugin-sdk`)

Plugins communicate with the host application through a unified SDK shim. Exposed APIs include:

- **State Management:**
  - `usePluginState<T>(pluginId)`: React hook to read and bind plugin state.
  - `getPluginState<T>(pluginId)`: Retrieve state imperatively (useful in background workers).
  - `pluginStateActions.set(pluginId, data)`: Modify the plugin's global central state.
  - `subscribePluginState(pluginId, callback)`: Listen for external/Tauri state changes.
- **Storage:**
  - `fileStorage.readJson<T>(pluginId, filename)` / `writeJson(...)`: Save local config/cache files in the app's sandboxed plugins directory.
  - `secureStorage.getItem(key)` / `setItem(...)`: Store encrypted credentials (like OAuth API tokens) using native OS keyrings (Windows Credentials Manager).
- **OAuth & System:**
  - `oauth.requestDeviceCode(clientId, scope)` / `pollAccessToken(...)`: Safe device-authorization flow that bypasses CORS/redirect limitations.
  - `subscribeActiveTab(callback)`: Fires when the user switches tabs, allowing background loops to trigger instant polls.
  - `openInBrowser(url)`: Securely opens URLs using the native default system browser.

---

### How to Create a Plugin

1. **Setup Directory:**
   Create a new folder inside `plugins/` (e.g. `plugins/my-plugin`). Initialize it with a `package.json` and a `tsconfig.json`. Use path mapping in `tsconfig.json` to map `@aeronotch/plugin-sdk` to the local implementation file `src/plugins/sdk.ts` for type checking:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@aeronotch/plugin-sdk": ["../../src/plugins/sdk.ts"]
       }
     }
   }
   ```

2. **Implement Components:**
   - **Background Loop (`src/index.ts`):** Default-exports an `init()` function. Runs polling loops (using fetch/polling) and updates central memory using `pluginStateActions.set(...)`.
   - **Compact View (`src/compact.tsx`):** Default-exports a React component displaying miniature metrics or icons in the active island.
   - **Expanded View (`src/expanded.tsx`):** Default-exports a React component displaying detail lists, graphs, or logs inside the focused dropdown menu.
   - **Settings Tab (`src/settings.tsx`):** Default-exports a settings panel for user authentication, repository selection, and rate parameters.

3. **Build and Local Install:**
   Compile the TS source files into bundled ES modules using Esbuild (see `plugins/github-plugin/build.mjs` for reference).
   Run the following script command to build and install your plugin into the local `%APPDATA%` folder:
   ```bash
   pnpm plugins:build && pnpm plugins:install
   ```

4. **Production Publish & CD:**
   Push changes to the `main` branch. The automated CD workflow (`release-plugins.yml`) will detect changes in your folder, perform version increments based on conventional commits, update the global store `registry.json`, and deploy the built artifacts to GitHub Pages for instant, in-app installation.

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
