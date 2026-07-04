import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getMicStatus } from "../lib/tauri-commands";
import { useIslandStore } from "../stores/island-store";
import type { MicStatus } from "../types";
import { getWindowLabel } from "../lib/windowLabel";

export function useMicStatus() {
  const [windowLabel] = useState(getWindowLabel);
  const setMicStatus = useIslandStore((s) => s.setMicStatus);

  useEffect(() => {
    // 1. Fetch initial mic status on mount only for main window
    if (windowLabel === "main") {
      const fetchInitialMicStatus = async () => {
        try {
          const status = await getMicStatus();
          setMicStatus(status);
        } catch {
          // Silently fail
        }
      };
      fetchInitialMicStatus();
    }

    // 2. Listen to async updates pushed by the Rust backend loop (all windows)
    let unlistenFn: (() => void) | null = null;
    const setupListener = async () => {
      try {
        unlistenFn = await listen<MicStatus>("mic-status-changed", (event) => {
          setMicStatus(event.payload);
        });
      } catch (err) {
        console.error("Failed to listen to mic status changes:", err);
      }
    };
    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [windowLabel, setMicStatus]);
}
