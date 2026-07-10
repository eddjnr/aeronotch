import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { bootstrapPlugins } from "./plugin-manager";
import { usePluginStore } from "./plugin-store";
import type { PluginManifest } from "./types";

/**
 * Bootstraps all installed plugins on app startup, and listens to
 * plugins-changed events from other windows for hot-reloads/uninstalls.
 * Mount this hook once in App.tsx (main window only).
 */
export function usePluginBootstrap() {
  useEffect(() => {
    // Initial bootstrap on app start
    bootstrapPlugins().catch((e) => {
      console.error("[PluginBootstrap] Failed to bootstrap plugins:", e);
    });

    // Sync state and bootstrap again if a plugin is installed/removed in Settings window
    const unlistenPromise = listen("plugins-changed", (event) => {
      const payload = event.payload as { installed: PluginManifest[] };
      if (payload?.installed) {
        usePluginStore.setState({ installed: payload.installed });
        bootstrapPlugins().catch(console.error);
      }
    });

    // Sync plugin data changes between windows
    const unlistenDataPromise = listen("plugin-data-changed", (event) => {
      const payload = event.payload as { pluginId: string; data: any };
      if (payload?.pluginId) {
        usePluginStore.setState((state) => {
          const currentData = state.pluginData[payload.pluginId];
          if (JSON.stringify(currentData) === JSON.stringify(payload.data)) {
            return {};
          }
          return {
            pluginData: {
              ...state.pluginData,
              [payload.pluginId]: payload.data,
            },
          };
        });
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      unlistenDataPromise.then((unlisten) => unlisten());
    };
  }, []);
}
