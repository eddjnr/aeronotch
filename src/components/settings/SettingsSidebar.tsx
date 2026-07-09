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

type TabId = "general" | "widgets" | "integrations" | "about";

interface SettingsSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const NAV_ITEMS: {
  id: TabId;
  labelKey: TranslationKey;
  icon: typeof Settings2;
}[] = [
  { id: "general", labelKey: "tabGeneral", icon: Settings2 },
  { id: "widgets", labelKey: "tabWidgets", icon: GridEdit2 },
  { id: "integrations", labelKey: "tabIntegrations", icon: Link12 },
  { id: "about", labelKey: "tabAbout", icon: InfoCircle3 },
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
          {NAV_ITEMS.map(({ id, labelKey, icon: Icon }) => (
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
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-white/40 font-medium leading-none">
        <span>AeroNotch v0.1.15</span>
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
