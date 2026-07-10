import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { PluginManifest, LoadedPlugin, PluginInstallState } from "./types";

// ── Store State ───────────────────────────────────────────────────────────────

interface PluginStoreState {
  /**
   * List of installed plugin manifests.
   * Persisted to localStorage so plugins survive app restarts.
   */
  installed: PluginManifest[];

  /**
   * Runtime loaded plugins (compact + expanded components).
   * NOT persisted — rebuilt on app startup by loading from disk.
   */
  loaded: Record<string, LoadedPlugin>;

  /**
   * Per-plugin isolated state storage.
   * Plugins read/write their own state via the SDK.
   * NOT persisted here — plugins manage their own persistence if needed.
   */
  pluginData: Record<string, unknown>;

  /**
   * Visibility settings for each plugin widget.
   * Can be: 'all' | 'compact' | 'expanded' | 'hidden'.
   */
  pluginVisibility: Record<string, "all" | "compact" | "expanded" | "hidden">;

  /**
   * Installation progress state per plugin ID.
   */
  installStatus: Record<string, PluginInstallState>;

  /**
   * Ephemeral loading errors per plugin ID.
   */
  loadErrors: Record<string, string>;

  /** Update widget visibility */
  setPluginVisibility: (
    pluginId: string,
    visibility: "all" | "compact" | "expanded" | "hidden",
  ) => void;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Register an installed manifest (persisted) */
  registerInstalled: (manifest: PluginManifest) => void;

  /** Remove an installed manifest (persisted) */
  unregisterInstalled: (pluginId: string) => void;

  /** Register a fully loaded plugin with its React components (runtime) */
  registerLoaded: (plugin: LoadedPlugin) => void;

  /** Remove a loaded plugin from runtime (does not affect disk/persistence) */
  unregisterLoaded: (pluginId: string) => void;

  /** Update plugin-specific state data */
  setPluginData: (pluginId: string, data: unknown) => void;

  /** Merge partial data into plugin state */
  mergePluginData: (pluginId: string, partial: Record<string, unknown>) => void;

  /** Update installation status */
  setInstallStatus: (pluginId: string, state: PluginInstallState) => void;

  /** Clear installation status */
  clearInstallStatus: (pluginId: string) => void;

  /** Set a load error for a plugin */
  setLoadError: (pluginId: string, error: string | null) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePluginStore = create<PluginStoreState>()(
  persist(
    (set) => ({
      installed: [],
      loaded: {},
      pluginData: {},
      installStatus: {},
      pluginVisibility: {},

      registerInstalled: (manifest) =>
        set((state) => {
          // Replace existing manifest if it already exists (update)
          const filtered = state.installed.filter((m) => m.id !== manifest.id);
          return { installed: [...filtered, manifest] };
        }),

      unregisterInstalled: (pluginId) =>
        set((state) => {
          const nextVisibility = { ...(state.pluginVisibility ?? {}) };
          delete nextVisibility[pluginId];
          return {
            installed: state.installed.filter((m) => m.id !== pluginId),
            pluginVisibility: nextVisibility,
          };
        }),

      setPluginVisibility: (pluginId, visibility) => {
        set((state) => ({
          pluginVisibility: {
            ...(state.pluginVisibility ?? {}),
            [pluginId]: visibility,
          },
        }));

        import("@tauri-apps/api/event")
          .then(({ emit }) =>
            emit("plugin-visibility-changed", { pluginId, visibility }),
          )
          .catch(console.error);
      },

      registerLoaded: (plugin) =>
        set((state) => ({
          loaded: { ...state.loaded, [plugin.manifest.id]: plugin },
        })),

      unregisterLoaded: (pluginId) =>
        set((state) => {
          const next = { ...state.loaded };
          delete next[pluginId];
          return { loaded: next };
        }),

      loadErrors: {},

      setPluginData: (pluginId, data) => {
        const prev = usePluginStore.getState().pluginData[pluginId];
        if (JSON.stringify(prev) === JSON.stringify(data)) return;

        set({ pluginData: { ...usePluginStore.getState().pluginData, [pluginId]: data } });

        import("@tauri-apps/api/event")
          .then(({ emit }) => emit("plugin-data-changed", { pluginId, data }))
          .catch(console.error);
      },

      mergePluginData: (pluginId, partial) => {
        const existing = (usePluginStore.getState().pluginData[pluginId] as Record<string, unknown>) ?? {};
        const merged = { ...existing, ...partial };
        if (JSON.stringify(existing) === JSON.stringify(merged)) return;

        set({
          pluginData: {
            ...usePluginStore.getState().pluginData,
            [pluginId]: merged,
          },
        });

        import("@tauri-apps/api/event")
          .then(({ emit }) => emit("plugin-data-changed", { pluginId, data: merged }))
          .catch(console.error);
      },

      setInstallStatus: (pluginId, status) =>
        set((state) => ({
          installStatus: { ...state.installStatus, [pluginId]: status },
        })),

      clearInstallStatus: (pluginId) =>
        set((state) => {
          const next = { ...state.installStatus };
          delete next[pluginId];
          return { installStatus: next };
        }),

      setLoadError: (pluginId, error) =>
        set((state) => {
          const next = { ...state.loadErrors };
          if (error) {
            next[pluginId] = error;
          } else {
            delete next[pluginId];
          }
          return { loadErrors: next };
        }),
    }),
    {
      name: "winotch-plugins",
      // Persist manifests and pluginVisibility
      partialize: (state) => ({
        installed: state.installed,
        pluginVisibility: state.pluginVisibility ?? {},
      }),
    },
  ),
);

// ── Selectors (convenience hooks) ─────────────────────────────────────────────

export function useLoadedPlugins(): LoadedPlugin[] {
  return usePluginStore(useShallow((s) => Object.values(s.loaded)));
}

export function useLoadedPlugin(pluginId: string): LoadedPlugin | undefined {
  return usePluginStore((s) => s.loaded[pluginId]);
}

export function useInstalledPlugins(): PluginManifest[] {
  return usePluginStore((s) => s.installed);
}

export function usePluginData<T>(pluginId: string): T | undefined {
  return usePluginStore((s) => s.pluginData[pluginId] as T | undefined);
}
