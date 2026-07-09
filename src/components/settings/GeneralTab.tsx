import { m } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RotateLeft2 } from "reicon-react";
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
        <h1 className="text-[22px] font-bold text-white tracking-tight">
          {t("generalTitle")}
        </h1>
        <p className="text-[13px] text-white/40 mt-1">{t("generalSubtitle")}</p>
      </div>

      <SettingsGroup title={t("groupAppearance")}>
        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblScreenPosition")}
            </span>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-lg p-0.5 border border-white/[0.08]">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => updateAndEmit("position", pos)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all outline-none ${
                  settings.position === pos
                    ? "bg-[#3a3a3c] shadow-[0_1px_2px_rgba(0,0,0,0.2)] text-white"
                    : "text-white/60 hover:text-white"
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

        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
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
              onChange={(e) =>
                updateAndEmit("opacity", parseFloat(e.target.value))
              }
              className="flex-1 h-1 bg-[#3a3a3c] rounded-lg appearance-none accent-[#007aff] outline-none"
            />
            <span className="font-semibold text-xs text-white w-8 text-right">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblMonitorPlacement")}
            </span>
          </div>
          <Select
            value={settings.monitorPlacement || "primary"}
            onValueChange={handleMonitorPlacementChange}
          >
            <SelectTrigger className="w-48 text-xs font-semibold bg-[#3a3a3c] border-none text-white hover:bg-white/5 transition-colors rounded-xl h-9 px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2c2c2e] border border-white/[0.08] shadow-md rounded-xl p-1 text-white">
              <SelectItem value="primary">{t("monitorPrimary")}</SelectItem>
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
        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblLanguage")}
            </span>
          </div>
          <Select
            value={settings.language || "en"}
            onValueChange={(val) =>
              updateAndEmit("language", val as "en" | "pt-BR")
            }
          >
            <SelectTrigger className="w-40 text-xs font-semibold bg-[#3a3a3c] border-none text-white hover:bg-white/5 transition-colors rounded-xl h-9 px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2c2c2e] border border-white/[0.08] shadow-md rounded-xl p-1 text-white">
              <SelectItem value="en">{t("langEn")}</SelectItem>
              <SelectItem value="pt-BR">{t("langPtBR")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("groupSystem")}>
        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblLaunchStartup")}
            </span>
          </div>
          <Switch checked={autostart} onCheckedChange={toggleAutostart} size="sm" />
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent hover:bg-red-500/10 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblResetDefaults")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold transition-all outline-none"
          >
            <RotateLeft2 size={14} />
            <span>{t("btnResetSettings")}</span>
          </button>
        </div>
      </SettingsGroup>
    </m.div>
  );
}
