import { useState, useEffect } from 'react';
import { LazyMotion, domAnimation } from "framer-motion";
import { Island } from './components/island/Island';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ErrorBoundary } from './components/ui/error-boundary';
import { useSystemInfo } from './hooks/useSystemInfo';
import { useMediaInfo } from './hooks/useMediaInfo';
import { useMicStatus } from './hooks/useMicStatus';
import { useWeatherInfo } from './hooks/useWeatherInfo';
import { useSettingsStore } from './stores/settings-store';
import { syncMonitorWindows } from './lib/tauri-commands';
import { getWindowLabel } from './lib/windowLabel';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePluginBootstrap } from './plugins/usePluginBootstrap';

function App() {
  const [windowLabel] = useState<string>(getWindowLabel);

  useSystemInfo();
  useMediaInfo();
  useMicStatus();
  useWeatherInfo();
  usePluginBootstrap();

  useEffect(() => {
    if (windowLabel === 'main') {
      const placement = useSettingsStore.getState().monitorPlacement || 'primary';
      syncMonitorWindows(placement).catch(console.error);
    } else if (windowLabel === 'settings') {
      document.documentElement.classList.add('dark');
      // Show the settings window only after React has finished rendering the dark mode layout.
      // A small timeout ensures the document has painted the dark background, preventing the white flash.
      setTimeout(() => {
        getCurrentWebviewWindow().show().then(() => {
          getCurrentWebviewWindow().setFocus().catch(console.error);
        }).catch(console.error);
      }, 80);
    }
  }, [windowLabel]);

  return (
    <LazyMotion features={domAnimation}>
      {windowLabel === 'settings' ? (
        <ErrorBoundary>
          <main className="dark w-full h-full bg-[#1c1c1e] text-white overflow-hidden select-none font-sans">
            <SettingsPanel />
          </main>
        </ErrorBoundary>
      ) : (
        <main className="w-full h-full bg-transparent overflow-hidden">
          <ErrorBoundary>
            <Island />
          </ErrorBoundary>
        </main>
      )}
    </LazyMotion>
  );
}

export default App;
