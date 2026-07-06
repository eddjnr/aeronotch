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

function App() {
  const [windowLabel] = useState<string>(getWindowLabel);

  useSystemInfo();
  useMediaInfo();
  useMicStatus();
  useWeatherInfo();

  useEffect(() => {
    if (windowLabel === 'main') {
      const placement = useSettingsStore.getState().monitorPlacement || 'primary';
      syncMonitorWindows(placement).catch(console.error);
    }
  }, [windowLabel]);

  return (
    <LazyMotion features={domAnimation}>
      {windowLabel === 'settings' ? (
        <ErrorBoundary>
          <main className="w-full h-full bg-[#ececec] text-[#333333] overflow-hidden select-none font-sans">
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
