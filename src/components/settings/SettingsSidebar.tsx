import {
  Settings,
  LayoutGrid,
  Link2,
  Info,
  HeartHandshake,
} from "lucide-react";
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
  icon: typeof Settings;
}[] = [
  { id: "general", labelKey: "tabGeneral", icon: Settings },
  { id: "widgets", labelKey: "tabWidgets", icon: LayoutGrid },
  { id: "integrations", labelKey: "tabIntegrations", icon: Link2 },
  { id: "about", labelKey: "tabAbout", icon: Info },
];

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="w-48 bg-[#e8e8ea] border-r border-[#d9d9d9] flex flex-col justify-between flex-shrink-0 select-none">
      <div className="flex flex-col pt-6 px-3">
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <img
            src="/logo.png"
            alt="AeroNotch Logo"
            className="w-8 h-8 rounded-lg shadow-sm object-cover select-none pointer-events-none"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#1d1d1f] tracking-tight leading-none">
              AeroNotch
            </span>
            <span className="text-[9px] text-[#86868b] mt-0.5">
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
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === id
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  activeTab === id ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-[#d9d9d9]/60 flex items-center justify-between text-[9px] text-[#86868b] font-medium leading-none">
        <span>AeroNotch v0.1.13</span>
        <HeartHandshake className="w-3 h-3 text-[#ff2d55]" />
      </div>
    </div>
  );
}
