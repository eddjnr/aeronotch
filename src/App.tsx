import { useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Island } from './components/island/Island';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useSystemInfo } from './hooks/useSystemInfo';
import { useMediaInfo } from './hooks/useMediaInfo';
import { useWeatherInfo } from './hooks/useWeatherInfo';

// Resolve window label synchronously on startup to prevent initial-render layout/sizing thrashing
let initialLabel = 'main';
try {
  initialLabel = getCurrentWebviewWindow().label;
} catch {
  // Web browser fallback
  const params = new URLSearchParams(window.location.search);
  initialLabel = params.get('window') || 'main';
}

function App() {
  const [windowLabel] = useState<string>(initialLabel);

  // Initialize data hooks
  useSystemInfo();
  useMediaInfo();
  useWeatherInfo();

  if (windowLabel === 'settings') {
    return (
      <main className="w-full h-full bg-[#ececec] text-[#333333] overflow-hidden select-none font-sans">
        <SettingsPanel />
      </main>
    );
  }

  return (
    <main className="w-full h-full bg-transparent overflow-hidden">
      <Island />
    </main>
  );
}

export default App;
