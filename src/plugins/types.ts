import type { ComponentType } from "react";

// ── Plugin Manifest ──────────────────────────────────────────────────────────
// The manifest.json that lives alongside the plugin bundle.
export interface PluginManifest {
  /** Unique identifier, used as the tab ID and state key. e.g. "github" */
  id: string;
  /** Human-readable display name. e.g. "GitHub Actions" */
  name: string;
  /** Semver plugin version. e.g. "1.0.0" */
  version: string;
  /** Optional custom SVG path (d attribute) for the tab icon */
  icon?: string;
  /** Description shown in the plugin manager UI */
  description?: string;
  /** Plugin author */
  author?: string;
  /**
   * Base URL where the plugin bundle files are hosted.
   * e.g. "https://github.com/eddjnr/winotch-plugins/releases/download/github-v1.0.0"
   */
  repository?: string;
  /** Background entry point script to run on plugin loading. e.g. "dist/index.js" */
  entry?: string;
  /** Bundle entry points, relative to the manifest URL base */
  ui: {
    /** Rendered inside the compact island bar (small indicator) */
    compact?: string;
    /** Rendered as a full tab panel in the expanded island */
    expanded?: string;
    /** Rendered inside the settings panel for configuration */
    settings?: string;
  };
}

// ── Loaded Plugin ─────────────────────────────────────────────────────────────
// Runtime representation after the plugin JS has been dynamically imported.
export interface LoadedPlugin {
  manifest: PluginManifest;
  /** React component for the compact island slot */
  compact?: ComponentType;
  /** React component for the expanded tab panel */
  expanded?: ComponentType;
  /** React component for settings configurations */
  settings?: ComponentType;
}

// ── Plugin Context ────────────────────────────────────────────────────────────
// Passed to plugins via the SDK so they can read/write their own state.
export interface PluginContext {
  pluginId: string;
}

// ── Installation states ───────────────────────────────────────────────────────
export type PluginInstallStatus =
  | "idle"
  | "fetching"
  | "writing"
  | "loading"
  | "ready"
  | "error";

export interface PluginInstallState {
  status: PluginInstallStatus;
  error?: string;
}
