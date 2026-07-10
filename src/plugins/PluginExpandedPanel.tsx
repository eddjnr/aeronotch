import { ErrorBoundary } from "../components/ui/error-boundary";
import { useLoadedPlugin } from "./plugin-store";

interface PluginExpandedPanelProps {
  pluginId: string;
}

/**
 * Renders the expanded panel for a specific plugin.
 * Used in IslandLayout.tsx when a plugin tab is active.
 */
export function PluginExpandedPanel({ pluginId }: PluginExpandedPanelProps) {
  const plugin = useLoadedPlugin(pluginId);

  if (!plugin?.expanded) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-xs">
        Plugin "{pluginId}" has no expanded view
      </div>
    );
  }

  const Expanded = plugin.expanded;

  return (
    <ErrorBoundary>
      <Expanded />
    </ErrorBoundary>
  );
}
