import { useEffect } from "react";
import type { TabId } from "../types";

export function useTabFallback(
  activeTab: TabId,
  hasHomeTab: boolean,
  hasSystemTab: boolean,
  hasWeatherTab: boolean,
  hasTrayTab: boolean,
  setActiveTab: (tab: TabId) => void,
) {
  useEffect(() => {
    const TAB_ORDER: TabId[] = ["home", "system", "weather", "tray"];

    const tabVisibility: Record<TabId, boolean> = {
      home: hasHomeTab,
      system: hasSystemTab,
      weather: hasWeatherTab,
      tray: hasTrayTab,
    };

    if (tabVisibility[activeTab]) return;

    const fallback = TAB_ORDER.find((tab) => tabVisibility[tab]);
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
