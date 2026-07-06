import { type ReactNode } from "react";
import { m } from "framer-motion";
import { Home, Folder, Cpu, Cloud } from "lucide-react";
import type { TabId } from "../../types";

interface TabDefinition {
  id: TabId;
  icon: ReactNode;
  visible: boolean;
  inactiveClass?: string;
}

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasHomeTab: boolean;
  hasTrayTab: boolean;
  hasSystemTab: boolean;
  hasWeatherTab: boolean;
}

export function TabBar({
  activeTab,
  onTabChange,
  hasHomeTab,
  hasTrayTab,
  hasSystemTab,
  hasWeatherTab,
}: TabBarProps) {
  const tabs: TabDefinition[] = [
    { id: "home", icon: <Home className="w-3.5 h-3.5" />, visible: hasHomeTab },
    { id: "tray", icon: <Folder className="w-3.5 h-3.5" />, visible: hasTrayTab },
    { id: "system", icon: <Cpu className="w-3.5 h-3.5" />, visible: hasSystemTab },
    {
      id: "weather",
      icon: <Cloud className="w-3.5 h-3.5" />,
      visible: hasWeatherTab,
      inactiveClass: "text-white/45 hover:text-white/60",
    },
  ];

  return (
    <div className="flex items-center gap-1 relative">
      {tabs.map((tab) => tab.visible ? (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
            activeTab === tab.id
              ? "text-white font-bold"
              : (tab.inactiveClass ?? "text-white/40 hover:text-white/60")
          }`}
        >
          {activeTab === tab.id && (
            <m.div
              layoutId="activeHeaderTabIndicator"
              className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          {tab.icon}
        </button>
      ) : null)}
    </div>
  );
}
