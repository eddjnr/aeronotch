import { useState, useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Island } from './components/island/Island';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ErrorBoundary } from './components/ui/error-boundary';
import { useSystemInfo } from './hooks/useSystemInfo';
import { useMediaInfo } from './hooks/useMediaInfo';
import { useWeatherInfo } from './hooks/useWeatherInfo';
import { useSettingsStore } from './stores/settings-store';
import { syncMonitorWindows } from './lib/tauri-commands';

// Resolve window label synchronously on startup using URL parameters or Tauri API
const params = new URLSearchParams(window.location.search);
let initialLabel = params.get('window') || 'main';

try {
  // If we are in Tauri and the webview window label is already resolved, prioritize it
  const tauriLabel = getCurrentWebviewWindow().label;
  if (tauriLabel) {
    initialLabel = tauriLabel;
  }
} catch {
  // Fallback to URL parameter or 'main'
}

function App() {
  const [windowLabel] = useState<string>(initialLabel);

  // Initialize data hooks
  useSystemInfo();
  useMediaInfo();
  useWeatherInfo();

  // Sync monitor windows on startup
  useEffect(() => {
    if (windowLabel === 'main') {
      const placement = useSettingsStore.getState().monitorPlacement || 'primary';
      syncMonitorWindows(placement).catch(console.error);
    }
  }, [windowLabel]);

  if (windowLabel === 'settings') {
    return (
      <ErrorBoundary>
        <main className="w-full h-full bg-[#ececec] text-[#333333] overflow-hidden select-none font-sans">
          <SettingsPanel />
        </main>
      </ErrorBoundary>
    );
  }

  return (
    <main className="w-full h-full bg-transparent overflow-hidden">
      <ErrorBoundary>
        <Island />
      </ErrorBoundary>
    </main>
  );
}

export default App;
