import {
  Settings2,
  GridEdit2,
  Link12,
  InfoCircle3,
} from "reicon-react";
import {
  useTranslation,
  type TranslationKey,
} from "../../hooks/useTranslation";

type TabId = "general" | "widgets" | "integrations" | "plugins" | "about";

interface SettingsSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

// Puzzle piece icon (inline SVG since reicon doesn't have one)
function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  );
}

const NAV_ITEMS: {
  id: TabId;
  label: string;
  labelKey?: TranslationKey;
  icon: typeof Settings2 | typeof PuzzleIcon;
}[] = [
  { id: "general", label: "General", labelKey: "tabGeneral", icon: Settings2 },
  { id: "widgets", label: "Widgets", labelKey: "tabWidgets", icon: GridEdit2 },
  { id: "integrations", label: "Integrations", labelKey: "tabIntegrations", icon: Link12 },
  { id: "plugins", label: "Plugins", labelKey: "tabPlugins", icon: PuzzleIcon },
  { id: "about", label: "About", labelKey: "tabAbout", icon: InfoCircle3 },
];

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="w-48 bg-[#171717] border-r border-white/[0.06] flex flex-col justify-between flex-shrink-0 select-none">
      <div className="flex flex-col pt-6 px-3">
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <img
            src="/logo.png"
            alt="AeroNotch Logo"
            className="w-8 h-8 rounded-lg shadow-sm object-cover select-none pointer-events-none"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-tight leading-none">
              AeroNotch
            </span>
            <span className="text-[9px] text-white/40 mt-0.5">
              {t("brandSubtitle")}
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ id, label, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all outline-none text-left ${
                activeTab === id
                  ? "bg-[#007aff] text-white"
                  : "text-[#f5f5f7]/90 hover:bg-white/5"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  activeTab === id ? "text-white" : "text-white/50"
                }`}
              />
              <span>{labelKey ? t(labelKey) : label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-white/40 font-medium leading-none">
        <span>AeroNotch v0.1.16</span>
        <a
          href="https://ko-fi.com/F6J722W2N5"
          target="_blank"
          rel="noopener noreferrer"
          title="Support me on Ko-fi"
          className="relative inline-flex items-center justify-center p-1 rounded bg-[#292929] hover:bg-[#3a3a3a] active:scale-95 transition-all border border-white/[0.04] shadow-sm"
        >
          <img
            src="https://storage.ko-fi.com/cdn/cup-border.png"
            alt="Ko-fi donations"
            className="w-3.5 h-3 object-contain"
            style={{
              animation: "kofi-wiggle 3s infinite",
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes kofi-wiggle {
              0% { transform: rotate(0) scale(1) }
              60% { transform: rotate(0) scale(1) }
              75% { transform: rotate(0) scale(1.12) }
              80% { transform: rotate(0) scale(1.1) }
              84% { transform: rotate(-10deg) scale(1.1) }
              88% { transform: rotate(10deg) scale(1.1) }
              92% { transform: rotate(-10deg) scale(1.1) }
              96% { transform: rotate(10deg) scale(1.1) }
              100% { transform: rotate(0) scale(1) }
            }
          `}} />
        </a>
      </div>
    </div>
  );
}
