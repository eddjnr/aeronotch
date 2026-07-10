import { ErrorBoundary } from "../components/ui/error-boundary";
import { useLoadedPlugins } from "./plugin-store";

/**
 * Renders the compact slot for all loaded plugins that have a compact component.
 * Placed inside CompactContent.tsx in the left area of the compact island bar.
 */
export function PluginCompactSlot() {
  const plugins = useLoadedPlugins();

  const pluginsWithCompact = plugins.filter((p) => p.compact != null);

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
