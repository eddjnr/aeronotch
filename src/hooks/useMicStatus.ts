import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getMicStatus } from '../lib/tauri-commands';
import { useIslandStore } from '../stores/island-store';
import type { MicStatus } from '../types';

export function useMicStatus() {
  const setMicStatus = useIslandStore((s) => s.setMicStatus);

  useEffect(() => {
    // 1. Fetch initial mic status on mount
    const fetchInitialMicStatus = async () => {
      try {
        const status = await getMicStatus();
        setMicStatus(status);
      } catch {
        // Silently fail
      }
    };
    fetchInitialMicStatus();

    // 2. Listen to async updates pushed by the Rust backend loop
    // (catches external changes too, e.g. Teams/Zoom mute or hardware mute keys)
    let unlistenFn: (() => void) | null = null;
    const setupListener = async () => {
      try {
        unlistenFn = await listen<MicStatus>('mic-status-changed', (event) => {
          setMicStatus(event.payload);
        });
      } catch (err) {
        console.error('Failed to listen to mic status changes:', err);
      }
    };
    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [setMicStatus]);
}
