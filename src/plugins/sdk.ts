import { usePluginStore } from "./plugin-store";
import { saveSecureToken, getSecureToken, deleteSecureToken } from "../lib/plugin-secure-commands";
import { writePluginFile, readPluginFile } from "../lib/plugin-commands";
import { useIslandStore } from "../stores/island-store";

/**
 * Gets the active tab ID of the island view.
 */
export function getActiveTab(): string {
  return useIslandStore.getState().activeTab;
}

/**
 * Subscribes to changes in the active tab ID.
 * Returns an unsubscribe function.
 */
export function subscribeActiveTab(callback: (tab: string) => void): () => void {
  let prevVal = useIslandStore.getState().activeTab;
  return useIslandStore.subscribe((s) => {
    const val = s.activeTab;
    if (val !== prevVal) {
      prevVal = val;
      callback(val);
    }
  });
}

/**
 * Gets whether the app currently has window focus.
 */
export function isWindowFocused(): boolean {
  return document.hasFocus();
}

/**
 * Custom hook for plugins to read their isolated state.
 * Re-renders the component when the plugin's state changes.
 */
export function usePluginState<T>(pluginId: string): T | undefined {
  return usePluginStore((s) => s.pluginData[pluginId] as T | undefined);
}

/**
 * Gets the raw plugin state without triggering a React hook.
 * Safe to use in background scripts or normal JS code.
 */
export function getPluginState<T>(pluginId: string): T | undefined {
  return usePluginStore.getState().pluginData[pluginId] as T | undefined;
}

/**
 * Subscribes to plugin state changes.
 * Returns an unsubscribe function.
 */
export function subscribePluginState(pluginId: string, callback: (state: any) => void): () => void {
  let prevVal: any = undefined;
  return usePluginStore.subscribe((s) => {
    const val = s.pluginData[pluginId];
    if (val !== prevVal) {
      prevVal = val;
      callback(val);
    }
  });
}

/**
 * Access the plugin store's raw actions for state mutations.
 */
export const pluginStateActions = {
  set: (pluginId: string, data: unknown) => {
    usePluginStore.getState().setPluginData(pluginId, data);
  },
  merge: (pluginId: string, partial: Record<string, unknown>) => {
    usePluginStore.getState().mergePluginData(pluginId, partial);
  },
};

/**
 * Secure storage APIs (Windows Credential Manager / macOS Keychain).
 */
export const secureStorage = {
  saveToken: saveSecureToken,
  getToken: getSecureToken,
  deleteToken: deleteSecureToken,
};

/**
 * Persistent file storage helper for plugins (settings.json, etc.).
 */
export const fileStorage = {
  writeJson: async (pluginId: string, filename: string, data: unknown): Promise<string> => {
    const path = `plugins/${pluginId}/${filename}`;
    return writePluginFile(path, JSON.stringify(data, null, 2));
  },
  readJson: async <T>(pluginId: string, filename: string): Promise<T | null> => {
    const path = `plugins/${pluginId}/${filename}`;
    try {
      const content = await readPluginFile(path);
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  },
};

/**
 * OAuth device authorization commands (runs native bypass to prevent CORS issues)
 */
export const oauth = {
  requestDeviceCode: async (clientId: string, scope: string): Promise<any> => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("github_request_device_code", { clientId, scope });
  },
  pollAccessToken: async (clientId: string, deviceCode: string): Promise<any> => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("github_poll_access_token", { clientId, deviceCode });
  }
};
