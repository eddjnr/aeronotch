import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getMediaInfo } from '../lib/tauri-commands';
import { useIslandStore } from '../stores/island-store';
import type { MediaInfo } from '../types';

export function useMediaInfo() {
  const setMediaInfo = useIslandStore((s) => s.setMediaInfo);

  useEffect(() => {
    // 1. Fetch initial media info on mount
    const fetchInitialMedia = async () => {
      try {
        const info = await getMediaInfo();
        setMediaInfo(info);
      } catch {
        // Silently fail
      }
    };
    fetchInitialMedia();

    // 2. Listen to async updates pushed by the Rust backend loop
    let unlistenFn: (() => void) | null = null;
    const setupListener = async () => {
      try {
        unlistenFn = await listen<MediaInfo | null>('media-changed', (event) => {
          setMediaInfo(event.payload);
        });
      } catch (err) {
        console.error('Failed to listen to media changes:', err);
      }
    };
    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [setMediaInfo]);
}
