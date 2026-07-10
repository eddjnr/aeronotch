import { useState } from "react";
import { m } from "framer-motion";
import { useInstalledPlugins, usePluginStore } from "../../plugins/plugin-store";
import { emit } from "@tauri-apps/api/event";
import { installPlugin, uninstallPlugin, loadPlugin } from "../../plugins/plugin-manager";
import { writePluginFile } from "../../lib/plugin-commands";

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function PluginsTab() {
  const installed = useInstalledPlugins();
  const installStatus = usePluginStore((s) => s.installStatus);
  const loaded = usePluginStore((s) => s.loaded);
  const loadErrors = usePluginStore((s) => s.loadErrors);
  const [manifestUrl, setManifestUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleInstall = async () => {
    if (!manifestUrl.trim()) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installPlugin(manifestUrl.trim());
      setManifestUrl("");
    } catch (e) {
      setInstallError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const handleRegisterLocalTest = async () => {
    const manifest = {
      id: "test-plugin",
      name: "Sample Counter",
      version: "1.0.0",
      description: "A simple demo plugin with a stateful counter.",
      ui: {
        compact: "plugins/test-plugin/compact.js",
        expanded: "plugins/test-plugin/expanded.js",
      },
    };

    const compactCode = `
const React = window.React;

export default function Compact() {
  return React.createElement(
    "div",
    { className: "flex items-center gap-1 text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0" },
    React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" }),
    "Test Plugin Active"
  );
}
    `.trim();

    const expandedCode = `
const React = window.React;

export default function Expanded() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    "div",
    { className: "flex flex-col items-center justify-center h-full gap-4 text-white p-4" },
    React.createElement(
      "div",
      { className: "text-center" },
      React.createElement("h3", { className: "text-sm font-bold text-white" }, "Sample Plugin Expanded View"),
      React.createElement("p", { className: "text-xs text-white/50 mt-1" }, "This view is running dynamically from AppData!")
    ),
    React.createElement(
      "div",
      { className: "flex items-center gap-3 bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.08]" },
      React.createElement(
        "button",
        {
          onClick: () => setCount(count - 1),
          className: "px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-xs transition-colors select-none"
        },
        "-"
      ),
      React.createElement("span", { className: "text-sm font-mono font-bold w-8 text-center" }, count),
      React.createElement(
        "button",
        {
          onClick: () => setCount(count + 1),
          className: "px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-xs transition-colors select-none"
        },
        "+"
      )
    )
  );
}
    `.trim();

    try {
      // Write all files natively using Tauri filesystem wrappers to prevent any mismatch
      await writePluginFile("plugins/test-plugin/manifest.json", JSON.stringify(manifest, null, 2));
      await writePluginFile("plugins/test-plugin/compact.js", compactCode);
      await writePluginFile("plugins/test-plugin/expanded.js", expandedCode);

      // Register and load
      usePluginStore.getState().registerInstalled(manifest);
      await loadPlugin(manifest);
      emit("plugins-changed", { installed: usePluginStore.getState().installed }).catch(console.error);
    } catch (e) {
      setInstallError(String(e));
    }
  };

  const handleRegisterGitHubPlugin = async () => {
    const manifest = {
      id: "github-plugin",
      name: "GitHub Actions",
      version: "1.0.0",
      description: "Direct GitHub Actions pipeline monitoring with multi-account OAuth support.",
      icon: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z",
      entry: "plugins/github-plugin/index.js",
      ui: {
        compact: "plugins/github-plugin/compact.js",
        expanded: "plugins/github-plugin/expanded.js",
        settings: "plugins/github-plugin/settings.js",
      },
    };

    try {
      // Register and load
      usePluginStore.getState().registerInstalled(manifest);
      await loadPlugin(manifest);
      emit("plugins-changed", { installed: usePluginStore.getState().installed }).catch(console.error);
    } catch (e) {
      setInstallError(String(e));
    }
  };

  const handleUninstall = async (pluginId: string) => {
    await uninstallPlugin(pluginId);
    if (expandedId === pluginId) setExpandedId(null);
  };

  return (
    <m.div
      key="plugins"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-6 max-w-lg overflow-y-auto max-h-[82vh] pr-2 pb-6"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255, 255, 255, 0.12) transparent",
      }}
    >
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-white tracking-tight">Plugins</h1>
        <p className="text-[13px] text-zinc-400 mt-1">
          Extend the island with installable integrations. No app update needed.
        </p>
      </div>

      {/* Install from URL */}
      <div className="bg-black/20 rounded-lg border border-white/10 p-5 flex flex-col gap-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Install from URL
        </span>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Paste the URL to a plugin's manifest.json.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manifestUrl}
            onChange={(e) => setManifestUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInstall()}
            placeholder="https://example.com/my-plugin/manifest.json"
            className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#007aff] transition-all"
          />
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || !manifestUrl.trim()}
            className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
          >
            {installing ? "Installing..." : "Install"}
          </button>
        </div>
        {import.meta.env.DEV && (
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 mt-1 gap-4">
            <span className="text-[10px] text-zinc-400">Or load local plugins pre-written on your AppData:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegisterLocalTest}
                className="text-xs font-semibold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap active:scale-[0.98]"
              >
                Load Test Plugin
              </button>
              <button
                type="button"
                onClick={handleRegisterGitHubPlugin}
                className="text-xs font-semibold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap active:scale-[0.98]"
              >
                Load GitHub Plugin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Installed plugins list */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Installed ({installed.length})
        </span>

        {installed.length === 0 && (
          <div className="bg-black/20 rounded-lg border border-white/10 p-6 flex flex-col items-center gap-2 text-center">
            <svg className="w-8 h-8 text-white/15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
            </svg>
            <p className="text-xs text-zinc-500">No plugins installed yet.</p>
            <p className="text-[10px] text-zinc-600">Install a plugin using its manifest URL above.</p>
          </div>
        )}

        {installed.map((manifest) => {
          const isLoaded = !!loaded[manifest.id];
          const status = installStatus[manifest.id];
          const plugin = loaded[manifest.id];

          return (
            <div
              key={manifest.id}
              className="bg-black/20 rounded-lg border border-white/10 p-4 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-4 w-full">
                {/* Icon */}
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 flex-shrink-0">
                  {manifest.icon ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d={manifest.icon} />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{manifest.name}</span>
                    <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      v{manifest.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {status?.status === "loading" || status?.status === "fetching" || status?.status === "writing" ? (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {status.status}...
                      </span>
                    ) : loadErrors[manifest.id] ? (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Error: {loadErrors[manifest.id]}
                      </span>
                    ) : isLoaded ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        Installed
                      </span>
                    )}
                    {manifest.description && (
                      <span className="text-[10px] text-zinc-500 truncate">· {manifest.description}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {manifest.ui.settings && isLoaded && plugin?.settings && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === manifest.id ? null : manifest.id)}
                      className="text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors select-none active:scale-[0.98]"
                    >
                      {expandedId === manifest.id ? "Close" : "Configure"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUninstall(manifest.id)}
                    className="text-xs font-semibold text-red-400 border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 px-3 py-1.5 rounded-lg transition-colors active:scale-[0.98]"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Dynamic plugin settings view */}
              {expandedId === manifest.id && plugin?.settings && (
                <div className="w-full border-t border-white/[0.06] pt-4 mt-2">
                  <plugin.settings />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </m.div>
  );
}
