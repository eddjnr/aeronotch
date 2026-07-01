import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useIslandStore } from '../stores/island-store';
import type { SystemStats } from '../types';

export function useSystemInfo() {
  const setSystemStats = useIslandStore((s) => s.setSystemStats);

  useEffect(() => {
    const unlisten = listen<SystemStats>('system-stats', (event) => {
      setSystemStats(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setSystemStats]);
}
