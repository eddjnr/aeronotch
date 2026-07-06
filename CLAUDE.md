# CLAUDE.md

## IMPORTANT: Codebase Intelligence Instructions for aeronotch

### Architecture Overview

aeronotch is a **Tauri 2 desktop application** that bridges:

- **Frontend**: React + TypeScript + Tailwind CSS (TypeScript/React frontend)
- **Backend**: Rust via Tauri 2 (system commands & native APIs)

**Core Pattern**: Frontend components request data/actions → IPC layer handles serialization → Rust backend executes system calls via `window_manager` crate or WMI/DllExport wrappers.

### Data Flow

```
[Frontend: React]
    ↓ [Tauri v1/v2 IPC (JSON)]
[Tauri Command Handler]
    ↓ [Tauri Runtime]
[Rust: window_manager + Custom Modules]
    ↓ [System APIs: WMI/DllExport/WinAPI]
[OS: AeroSnap, Media Session, Google Calendar, etc.]
```

### Entry Points (Entry Points)

- **Frontend**: `src/App.tsx` (root React component), `src/main.tsx` (Vite entry)
- **Backend**: `src-tauri/src/main.rs` (Tauri v2 app entry with system modules), `src-tauri/src/lib.rs` (command registration layer)

### Tech Stack

**Languages**: Node.js, TypeScript, Rust  
**Frontend**: React 19, TypeScript, Tailwind CSS, Vite  
**Backend**: Tauri 2 (Rust)  
**UI Components**: shadcn/ui + Radix UI (frontend)  
**Testing**: Vitest  
**State Management**: Zustand

### System Modules (System Modules Exposed by Tauri Backend)

| Module                | File                               | Description                                                          |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| **Windows**           | `src-tauri/src/window_manager.rs`  | Core window manipulation API                                         |
| **Google Calendar**   | `src-tauri/src/google_calendar.rs` | Fetch Google Calendar events via REST API                            |
| **Media Session**     | `src-tauri/src/media.rs`           | Poll media session for current track info + position sync            |
| **Microphone Status** | `src-tauri/src/mic.rs`             | Monitor mic mute state + external changes (Teams/Zoom/hardware keys) |
| **System Info**       | `src-tauri/src/system_info.rs`     | Retrieve system properties via WMI                                   |
| **Weather**           | `src-tauri/src/weather.rs`         | Fetch weather data from OpenMeteo API                                |
| **WMI Metrics**       | `src-tauri/src/wmi_metrics.rs`     | Gather performance metrics (CPU/memory usage)                        |
| **Island Hit Test**   | `src-tauri/src/island_hit_test.rs` | Handle AUM hit testing for AeroNotch island regions                  |

### Key Scripts

- `pnpm dev`: Start Vite dev server
- `pnpm build`: Build frontend for production
- `pnpm tauri dev`: Run Tauri app in development mode (hot-reload enabled)
- `pnpm tauri build`: Build Tauri app for production distribution
- `pnpm test`: Run Vitest unit tests
- `pnpm test:watch`: Run Vitest in watch mode

### Project Structure

```
aeronotch/
├── src/                          # React frontend code (TypeScript)
│   ├── App.tsx                  # Root React component + main layout
│   ├── main.tsx                 # Vite entry point + DOM mounting
│   ├── components/              # Reusable React components
│   ├── hooks/                   # Custom React hooks
│   ├── styles/                  # CSS + Tailwind classes
│   ├── assets/                  # Static images/icons
│   └── index.css                # Global styles + Tailwind directives
├── src-tauri/                   # Rust backend (Tauri v2)
│   ├── src/                     # Rust source files
│   │   ├── main.rs             # Tauri v2 app entry + module initialization
│   │   ├── lib.rs              # Command registration layer
│   │   ├── window_manager.rs   # Core window manipulation API
│   │   ├── google_calendar.rs  # Google Calendar REST API wrapper
│   │   ├── media.rs            # Media session polling (title/position sync)
│   │   ├── mic.rs              # Microphone status monitoring
│   │   ├── system_info.rs      # System properties via WMI
│   │   ├── weather.rs          # OpenMeteo API wrapper
│   │   ├── wmi_metrics.rs      # Performance metrics (CPU/memory)
│   │   └── island_hit_test.rs  # AUM hit testing for AeroNotch islands
│   ├── build.rs                 # Rust build script
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.ts            # Tauri app configuration (IPC bindings)
│   └── Capabilities/            # Permission scopes for frontend↔backend IPC
├── public/                      # Static assets (icons, fonts)
├── pnpm-lock.yaml               # Dependency lockfile (pnpm ecosystem)
├── package.json                 # Node.js dependencies + scripts
├── vite.config.ts               # Vite bundler configuration
└── CLAUDE.md                    # This file
```

### Important Notes

- **Package Manager**: Always use `pnpm` (not npm/yarn)
- **Tauri Commands**: Prefix with `pnpm tauri` (e.g., `pnpm tauri tauri dev`)
- **Testing**: Run tests with `pnpm test`
- **Type Safety**: TypeScript frontend + Rust backend → full type safety across IPC boundary

### IPC Pattern

Frontend calls Tauri commands via `invoke()`:

```typescript
// Example: Frontend invokes Rust command
const handle = await invoke("window_move", { windowId, x, y });
await invoke("weather_get_current", { city: "São Paulo" });
```

Rust backend exposes commands via `#[tauri::command]` in `lib.rs`.

### Build Targets

- **Development**: `pnpm tauri dev` (hot-reload frontend + Rust)
- **Production**: `pnpm build` + `pnpm tauri build` → standalone `.exe` + assets
