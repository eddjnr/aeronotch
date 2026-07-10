import { type ReactNode } from "react";
import { m } from "framer-motion";
import type { TabId } from "../../types";
import { Folder, MusicDashboard2, Cpu, Cloud } from "reicon-react";
import type { LoadedPlugin } from "../../plugins/types";

interface TabDefinition {
  id: string;
  icon: ReactNode;
  visible: boolean;
  inactiveClass?: string;
}

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: TabId | string) => void;
  hasHomeTab: boolean;
  hasTrayTab: boolean;
  hasSystemTab: boolean;
  hasWeatherTab: boolean;
  pluginTabs?: LoadedPlugin[];
}

export function TabBar({
  activeTab,
  onTabChange,
  hasHomeTab,
  hasTrayTab,
  hasSystemTab,
  hasWeatherTab,
  pluginTabs = [],
}: TabBarProps) {
  const tabs: TabDefinition[] = [
    {
      id: "home",
      icon: <MusicDashboard2 size={16} weight="Filled" />,
      visible: hasHomeTab,
    },
    {
      id: "tray",
      icon: <Folder size={16} weight="Filled" />,
      visible: hasTrayTab,
    },
    {
      id: "system",
      icon: <Cpu size={16} weight="Filled" />,
      visible: hasSystemTab,
    },
    {
      id: "weather",
      icon: <Cloud size={16} weight="Filled" />,
      visible: hasWeatherTab,
      inactiveClass: "text-white/45 hover:text-white/60",
    },
    // Dynamic plugin tabs
    ...pluginTabs.map((plugin) => ({
      id: plugin.manifest.id,
      icon: plugin.manifest.icon ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d={plugin.manifest.icon} />
        </svg>
      ) : (
        <svg
          className="w-[14px] h-[14px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
          />
        </svg>
      ),
      visible: true,
    })),
  ];

  return (
    <div className="flex items-center gap-1 relative">
      {tabs.map((tab) =>
        tab.visible ? (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative p-1.5 rounded-lg outline-none select-none transition-colors ${
              activeTab === tab.id
                ? "text-white"
                : tab.inactiveClass || "text-white/30 hover:text-white/45"
            }`}
          >
            {activeTab === tab.id && (
              <m.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-white/[0.06] border border-white/[0.04] rounded-lg -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.06)]"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            {tab.icon}
          </button>
        ) : null,
      )}
    </div>
  );
}
