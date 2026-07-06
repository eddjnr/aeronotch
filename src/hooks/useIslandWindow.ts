import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ISLAND_DIMENSIONS } from "../lib/animation-config";
import { setIslandSize } from "../lib/tauri-commands";
import { useIslandStore } from "../stores/island-store";
import { useSettingsStore } from "../stores/settings-store";
import type { IslandMode } from "../types";

const EXPANDED_WINDOW_WIDTH = ISLAND_DIMENSIONS.expanded.width + 96;
const EXPANDED_WINDOW_HEIGHT = ISLAND_DIMENSIONS.expanded.height + 64;

export function useIslandWindow() {
  const mode = useIslandStore((s) => s.mode);
  const position = useSettingsStore((s) => s.position);
  const monitorPlacement = useSettingsStore((s) => s.monitorPlacement);

  // Stable callback — reads fresh position via .getState() to avoid re-creation
  const updateWindowSize = useCallback(
    async (targetMode: IslandMode, customPosition?: string) => {
      const dims = ISLAND_DIMENSIONS[targetMode];
      try {
        const effectivePosition =
          customPosition ?? useSettingsStore.getState().position;
        await setIslandSize(
          EXPANDED_WINDOW_WIDTH,
          EXPANDED_WINDOW_HEIGHT,
          effectivePosition,
          dims.width,
          dims.height,
        );
      } catch {
        /* may fail in dev browser mode */
      }
    },
    [],
  );

  // Sync settings from the preferences window into this window's store
  useEffect(() => {
    const unlistenPromise = listen("settings-changed", (event) => {
      const payload = event.payload as { key: string; value: unknown };
      if (payload?.key) {
        useSettingsStore.setState({ [payload.key]: payload.value });
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Re-sync window position when the app regains focus
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await getCurrentWebviewWindow().onFocusChanged(
        ({ payload: focused }) => {
          if (focused) {
            const currentMode = useIslandStore.getState().mode;
            updateWindowSize(currentMode);
          }
        },
      );
    };

    setup();
    return () => {
      unlisten?.();
    };
  }, [updateWindowSize]);

  // Re-sync when position or monitor preference changes
  useEffect(() => {
    updateWindowSize(mode);
  }, [position, monitorPlacement, updateWindowSize, mode]);

  return { updateWindowSize };
}
