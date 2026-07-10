import { ErrorBoundary } from "../components/ui/error-boundary";
import { useLoadedPlugins, usePluginStore } from "./plugin-store";

/**
 * Renders the compact slot for all loaded plugins that have a compact component.
 * Placed inside CompactContent.tsx in the left area of the compact island bar.
 */
export function PluginCompactSlot() {
  const plugins = useLoadedPlugins();
  const pluginVisibility = usePluginStore((s) => s.pluginVisibility) || {};

  const pluginsWithCompact = plugins.filter((p) => {
    if (p.compact == null) return false;
    const visibility = pluginVisibility[p.manifest.id] ?? "all";
    return visibility === "all" || visibility === "compact";
  });

  if (pluginsWithCompact.length === 0) return null;

  return (
    <>
      {pluginsWithCompact.map((plugin) => {
        const Compact = plugin.compact!;
        return (
          <ErrorBoundary key={plugin.manifest.id}>
            <Compact />
          </ErrorBoundary>
        );
      })}
    </>
  );
}
