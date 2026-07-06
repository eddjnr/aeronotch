import { m } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useSettingsEmit } from "../../hooks/useSettingsEmit";
import { useAutostart } from "../../hooks/useAutostart";
import { useMonitors } from "../../hooks/useMonitors";
import { SettingsGroup } from "./SettingsGroup";
import { syncMonitorWindows } from "../../lib/tauri-commands";

const POSITIONS = ["top-left", "top-center", "top-right"] as const;

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function GeneralTab() {
  const { t } = useTranslation();
  const { settings, updateAndEmit } = useSettingsEmit();
  const { autostart, toggleAutostart } = useAutostart();
  const { monitors } = useMonitors();

  const handleMonitorPlacementChange = async (val: string) => {
    await syncMonitorWindows(val);
    updateAndEmit("monitorPlacement", val);
  };

  const handleResetSettings = async () => {
    await syncMonitorWindows("primary");
    settings.resetSettings();
    const defaults = {
      position: "top-center" as const,
      showMusic: true,
      showCalendar: true,
      showSystem: true,
      showWeather: true,
      showClock: true,
      showTray: true,
      showMic: true,
      opacity: 1,
      language: "en" as const,
      monitorPlacement: "primary",
      rightCornerMode: "widgets" as const,
      customRightCornerUrl: "",
    };
    Object.entries(defaults).forEach(([key, value]) => {
      updateAndEmit(key as any, value as any);
    });
  };

  return (
    <m.div
      key="general"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-6 max-w-lg"
    >
      <div>
        <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
          {t("generalTitle")}
        </h1>
        <p className="text-[13px] text-[#86868b] mt-1">
          {t("generalSubtitle")}
        </p>
      </div>

      <SettingsGroup title={t("groupAppearance")}>
        <div className="flex items-center justify-between py-2.5 px-4 bg-white">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblScreenPosition")}
            </span>
          </div>
          <div className="flex bg-[#e8e8ea] rounded-lg p-0.5 border border-black/5">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => updateAndEmit("position", pos)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer outline-none ${
                  settings.position === pos
                    ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] text-[#1d1d1f]"
                    : "text-[#555557] hover:text-[#1d1d1f]"
                }`}
              >
                {pos === "top-left"
                  ? t("posLeft")
                  : pos === "top-center"
                    ? t("posCenter")
                    : t("posRight")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-white">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblOpacity")}
            </span>
          </div>
          <div className="flex items-center gap-2 w-40">
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={settings.opacity}
              aria-label={t("lblOpacity")}
              onChange={(e) => updateAndEmit("opacity", parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#e8e8ea] rounded-lg appearance-none cursor-pointer accent-[#007aff] outline-none"
            />
            <span className="font-semibold text-xs text-[#1d1d1f] w-8 text-right">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-white">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblMonitorPlacement")}
            </span>
          </div>
          <Select
            value={settings.monitorPlacement || "primary"}
            onValueChange={handleMonitorPlacementChange}
          >
            <SelectTrigger className="w-48 text-xs font-semibold bg-[#e8e8ea] border-none text-[#1d1d1f] hover:bg-black/5 transition-colors rounded-xl h-9 px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-black/5 shadow-md rounded-xl p-1">
              <SelectItem value="primary">
                {t("monitorPrimary")}
              </SelectItem>
              <SelectItem value="all">{t("monitorAll")}</SelectItem>
              {monitors.map((m) => {
                let displayName = t("monitorSpecific").replace(
                  "{index}",
                  (m.index + 1).toString(),
                );
                if (m.name) {
                  const match = m.name.match(/DISPLAY(\d+)/i);
                  if (match) {
                    displayName = t("monitorSpecific").replace(
                      "{index}",
                      match[1],
                    );
                  } else {
                    displayName = m.name;
                  }
                }
                return (
                  <SelectItem key={m.index} value={m.index.toString()}>
                    {`${displayName} (${m.width}x${m.height})`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("groupLanguage")}>
        <div className="flex items-center justify-between py-2.5 px-4 bg-white">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblLanguage")}
            </span>
          </div>
          <Select
            value={settings.language || "en"}
            onValueChange={(val) => updateAndEmit("language", val as "en" | "pt-BR")}
          >
            <SelectTrigger className="w-40 text-xs font-semibold bg-[#e8e8ea] border-none text-[#1d1d1f] hover:bg-black/5 transition-colors rounded-xl h-9 px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-black/5 shadow-md rounded-xl p-1">
              <SelectItem value="en">{t("langEn")}</SelectItem>
              <SelectItem value="pt-BR">{t("langPtBR")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("groupSystem")}>
        <div className="flex items-center justify-between py-2.5 px-4 bg-white">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblLaunchStartup")}
            </span>
          </div>
          <Switch checked={autostart} onChange={toggleAutostart} />
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-white hover:bg-red-50/20 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1d1d1f]">
              {t("lblResetDefaults")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-xs font-semibold transition-all cursor-pointer outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("btnResetSettings")}</span>
          </button>
        </div>
      </SettingsGroup>
    </m.div>
  );
}
