import type { ComponentType } from "react";
import { getAppDataDir, writePluginFile, readPluginFile, listPluginDir } from "../lib/plugin-commands";
import { usePluginStore } from "./plugin-store";
import type { PluginManifest, LoadedPlugin } from "./types";
import { emit } from "@tauri-apps/api/event";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLUGINS_DIR = "plugins";
const MANIFEST_FILENAME = "manifest.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Dynamically imports a JS string as an ES Module using a blob: URL.
 * This is the approach validated by the PoC: asset:// is blocked by WebView2
 * for dynamic imports, but blob: URLs work perfectly.
 */
async function importFromString(code: string): Promise<Record<string, unknown>> {
  const blob = new Blob([code], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    // @ts-ignore — dynamic import with variable URL (blob: scheme, vite-ignore)
    const mod = await import(/* @vite-ignore */ blobUrl);
    return mod as Record<string, unknown>;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Fetches a text resource from a URL. Throws on non-OK responses.
 */
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// ── Plugin Manager ────────────────────────────────────────────────────────────

/**
 * Fetches and parses a plugin manifest from a remote URL.
 */
export async function fetchManifest(manifestUrl: string): Promise<PluginManifest> {
  const text = await fetchText(manifestUrl);
  const manifest = JSON.parse(text) as PluginManifest;

  // Basic validation
  if (!manifest.id || !manifest.name || !manifest.version) {
    throw new Error("Invalid manifest: missing required fields (id, name, version)");
  }

  return manifest;
}

/**
 * Installs a plugin from a manifest URL:
 * 1. Fetches the manifest
 * 2. Downloads each bundle file
 * 3. Saves everything to AppData/plugins/{id}/
 * 4. Persists the manifest to the plugin store
 * 5. Loads the plugin into runtime
 */
export async function installPlugin(manifestUrl: string): Promise<void> {
  const { setInstallStatus, registerInstalled } = usePluginStore.getState();

  // ── Step 1: Fetch manifest ─────────────────────────────────────────────────
  let manifest: PluginManifest;
  try {
    setInstallStatus("__installing__", { status: "fetching" });
    manifest = await fetchManifest(manifestUrl);
  } catch (e) {
    setInstallStatus("__installing__", {
      status: "error",
      error: `Failed to fetch manifest: ${String(e)}`,
    });
    throw e;
  }

  const { id } = manifest;
  setInstallStatus(id, { status: "fetching" });

  // ── Step 2: Resolve base URL for relative bundle paths ───────────────────
  const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/"));

  // ── Step 3: Download bundle files ────────────────────────────────────────
  const filesToDownload: Array<{ relativePath: string; remoteUrl: string }> = [
    { relativePath: `${PLUGINS_DIR}/${id}/${MANIFEST_FILENAME}`, remoteUrl: manifestUrl },
  ];

  if (manifest.ui.compact) {
    filesToDownload.push({
      relativePath: `${PLUGINS_DIR}/${id}/compact.js`,
      remoteUrl: manifest.ui.compact.startsWith("http")
        ? manifest.ui.compact
        : `${baseUrl}/${manifest.ui.compact}`,
    });
  }

  if (manifest.ui.expanded) {
    filesToDownload.push({
      relativePath: `${PLUGINS_DIR}/${id}/expanded.js`,
      remoteUrl: manifest.ui.expanded.startsWith("http")
        ? manifest.ui.expanded
        : `${baseUrl}/${manifest.ui.expanded}`,
    });
  }

  if (manifest.ui.settings) {
    filesToDownload.push({
      relativePath: `${PLUGINS_DIR}/${id}/settings.js`,
      remoteUrl: manifest.ui.settings.startsWith("http")
        ? manifest.ui.settings
        : `${baseUrl}/${manifest.ui.settings}`,
    });
  }

  if (manifest.entry) {
    filesToDownload.push({
      relativePath: `${PLUGINS_DIR}/${id}/index.js`,
      remoteUrl: manifest.entry.startsWith("http")
        ? manifest.entry
        : `${baseUrl}/${manifest.entry}`,
    });
  }

  // ── Step 4: Write files to disk ───────────────────────────────────────────
  setInstallStatus(id, { status: "writing" });

  for (const file of filesToDownload) {
    const content = await fetchText(file.remoteUrl);
    await writePluginFile(file.relativePath, content);
  }

  // ── Step 5: Register in store (persisted) ────────────────────────────────
  registerInstalled(manifest);

  // ── Step 6: Load into runtime ─────────────────────────────────────────────
  setInstallStatus(id, { status: "loading" });
  await loadPlugin(manifest);

  setInstallStatus(id, { status: "ready" });

  // Sync to other windows
  emit("plugins-changed", { installed: usePluginStore.getState().installed }).catch(console.error);
}

/**
 * Loads an installed plugin from disk into the runtime store.
 * Called on app startup for each installed plugin.
 */
export async function loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin> {
  const { registerLoaded, setLoadError } = usePluginStore.getState();
  const { id } = manifest;

  const plugin: LoadedPlugin = { manifest };
  let errorSummary: string[] = [];

  // Clear previous load error
  setLoadError(id, null);

  // ── Load compact component ────────────────────────────────────────────────
  if (manifest.ui.compact) {
    const relativePath = `${PLUGINS_DIR}/${id}/compact.js`;
    try {
      const code = await readPluginFile(relativePath);
      const mod = await importFromString(code);
      plugin.compact = (mod.default ?? mod.Compact) as ComponentType;
    } catch (e) {
      console.warn(`[PluginManager] Failed to load compact component for "${id}":`, e);
      errorSummary.push(`Compact: ${String(e)}`);
    }
  }

  // ── Load expanded component ───────────────────────────────────────────────
  if (manifest.ui.expanded) {
    const relativePath = `${PLUGINS_DIR}/${id}/expanded.js`;
    try {
      const code = await readPluginFile(relativePath);
      const mod = await importFromString(code);
      plugin.expanded = (mod.default ?? mod.Expanded) as ComponentType;
    } catch (e) {
      console.warn(`[PluginManager] Failed to load expanded component for "${id}":`, e);
      errorSummary.push(`Expanded: ${String(e)}`);
    }
  }

  // ── Load settings component ───────────────────────────────────────────────
  if (manifest.ui.settings) {
    const relativePath = `${PLUGINS_DIR}/${id}/settings.js`;
    try {
      const code = await readPluginFile(relativePath);
      const mod = await importFromString(code);
      plugin.settings = (mod.default ?? mod.Settings) as ComponentType;
    } catch (e) {
      console.warn(`[PluginManager] Failed to load settings component for "${id}":`, e);
      errorSummary.push(`Settings: ${String(e)}`);
    }
  }

  if (errorSummary.length > 0) {
    setLoadError(id, errorSummary.join(" | "));
  } else {
    registerLoaded(plugin);
    console.log(`[PluginManager] Plugin "${id}" v${manifest.version} loaded.`);

    // ── Run entry script (initialize background services/polling) ─────────────
    if (manifest.entry) {
      const relativePath = `${PLUGINS_DIR}/${id}/index.js`;
      try {
        const code = await readPluginFile(relativePath);
        const mod = await importFromString(code);
        if (typeof mod.default === "function") {
          mod.default();
        } else if (typeof mod.init === "function") {
          mod.init();
        }
      } catch (e) {
        console.warn(`[PluginManager] Failed to run entry script for "${id}":`, e);
      }
    }
  }

  return plugin;
}

/**
 * Uninstalls a plugin:
 * 1. Removes from runtime store
 * 2. Removes from persisted store
 * Note: disk cleanup is async and best-effort.
 */
export async function uninstallPlugin(pluginId: string): Promise<void> {
  const { unregisterLoaded, unregisterInstalled } = usePluginStore.getState();

  // Remove from runtime
  unregisterLoaded(pluginId);

  // Remove from persisted store
  unregisterInstalled(pluginId);

  // Best-effort disk cleanup (don't fail if this errors)
  try {
    const { deletePluginFile } = await import("../lib/plugin-commands");
    await deletePluginFile(`${PLUGINS_DIR}/${pluginId}`);
  } catch (e) {
    console.warn(`[PluginManager] Could not delete plugin files for "${pluginId}":`, e);
  }

  console.log(`[PluginManager] Plugin "${pluginId}" uninstalled.`);

  // Sync to other windows
  emit("plugins-changed", { installed: usePluginStore.getState().installed }).catch(console.error);
}

/**
 * Bootstraps all installed plugins on app startup.
 * Reads manifests from disk and loads each plugin's components.
 */
export async function bootstrapPlugins(): Promise<void> {
  const { installed, loaded, unregisterLoaded } = usePluginStore.getState();

  // Unload any loaded plugins that are no longer in the installed list
  const installedIds = new Set(installed.map((m) => m.id));
  Object.keys(loaded).forEach((id) => {
    if (!installedIds.has(id)) {
      unregisterLoaded(id);
    }
  });

  if (installed.length === 0) return;

  console.log(`[PluginManager] Bootstrapping ${installed.length} installed plugin(s)...`);

  // Load only plugins that aren't already loaded
  const promises = installed
    .filter((manifest) => !loaded[manifest.id])
    .map((manifest) => loadPlugin(manifest));

  const results = await Promise.allSettled(promises);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[PluginManager] Failed to bootstrap plugin "${installed[i].id}":`,
        result.reason
      );
    }
  });
}

/**
 * Lists plugin directories found on disk (for diagnostics / recovery).
 */
export async function listInstalledOnDisk(): Promise<string[]> {
  try {
    return await listPluginDir(PLUGINS_DIR);
  } catch {
    return [];
  }
}

/**
 * Returns the AppData path for a plugin (for diagnostics).
 */
export async function getPluginPath(pluginId: string): Promise<string> {
  const base = await getAppDataDir();
  return `${base}/plugins/${pluginId}`;
}
