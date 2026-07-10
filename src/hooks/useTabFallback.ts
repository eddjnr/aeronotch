import { useEffect } from "react";
import type { TabId } from "../types";

const CORE_TABS: TabId[] = ["home", "system", "weather", "tray"];

export function useTabFallback(
  activeTab: TabId | string,
  hasHomeTab: boolean,
  hasSystemTab: boolean,
  hasWeatherTab: boolean,
  hasTrayTab: boolean,
  setActiveTab: (tab: TabId | string) => void,
) {
  useEffect(() => {
    const tabVisibility: Record<TabId, boolean> = {
      home: hasHomeTab,
      system: hasSystemTab,
      weather: hasWeatherTab,
      tray: hasTrayTab,
    };

    // Plugin tabs (not in core set) manage their own visibility
    if (!(activeTab in tabVisibility)) return;

    if (tabVisibility[activeTab as TabId]) return;

    const fallback = CORE_TABS.find((tab) => tabVisibility[tab]);
    if (fallback) setActiveTab(fallback);
  }, [
    activeTab,
    hasHomeTab,
    hasSystemTab,
    hasWeatherTab,
    hasTrayTab,
    setActiveTab,
  ]);
}
