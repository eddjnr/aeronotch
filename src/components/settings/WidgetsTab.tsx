import { m } from "framer-motion";
import {
  Cloud,
  Clock3,
  Music,
  Calendar,
  Activity2,
  Folder,
  Microphone,
  Grid22,
  TaskSquare2,
} from "reicon-react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  useTranslation,
  type TranslationKey,
} from "../../hooks/useTranslation";
import { useSettingsEmit } from "../../hooks/useSettingsEmit";
import { SettingsGroup } from "./SettingsGroup";
import { WidgetToggleRow } from "./WidgetToggleRow";

type WidgetKey =
  | "showMusic"
  | "showCalendar"
  | "showSystem"
  | "showWeather"
  | "showClock"
  | "showTray"
  | "showMic";

const WIDGETS: {
  key: WidgetKey;
  icon: typeof Music;
  labelKey: TranslationKey;
  bg: string;
  shadow: string;
}[] = [
  {
    key: "showMusic",
    icon: Music,
    labelKey: "lblMusicWidget",
    bg: "bg-[#ff2d55]/40",
    shadow: "shadow-[0_1px_3px_rgba(255,45,85,0.3)]",
  },
  {
    key: "showCalendar",
    icon: Calendar,
    labelKey: "lblCalendarWidget",
    bg: "bg-[#ff9500]/40",
    shadow: "shadow-[0_1px_3px_rgba(255,149,0,0.3)]",
  },
  {
    key: "showSystem",
    icon: Activity2,
    labelKey: "lblSystemWidget",
    bg: "bg-[#34c759]/40",
    shadow: "shadow-[0_1px_3px_rgba(52,199,89,0.3)]",
  },
  {
    key: "showWeather",
    icon: Cloud,
    labelKey: "lblWeatherWidget",
    bg: "bg-[#5ac8fa]/40",
    shadow: "shadow-[0_1px_3px_rgba(90,200,250,0.3)]",
  },
  {
    key: "showClock",
    icon: Clock3,
    labelKey: "lblClockWidget",
    bg: "bg-[#5856d6]/40",
    shadow: "shadow-[0_1px_3px_rgba(88,86,214,0.3)]",
  },
  {
    key: "showTray",
    icon: Folder,
    labelKey: "lblTrayWidget",
    bg: "bg-[#007aff]/40",
    shadow: "shadow-[0_1px_3px_rgba(0,122,255,0.3)]",
  },
  {
    key: "showMic",
    icon: Microphone,
    labelKey: "lblMicWidget",
    bg: "bg-[#ff3b30]/40",
    shadow: "shadow-[0_1px_3px_rgba(255,59,48,0.3)]",
  },
];

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function WidgetsTab() {
  const { t } = useTranslation();
  const { settings, updateAndEmit } = useSettingsEmit();

  return (
    <m.div
      key="widgets"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-6 max-w-lg"
    >
      <div>
        <h1 className="text-[22px] font-bold text-white tracking-tight">
          {t("widgetsTitle")}
        </h1>
        <p className="text-[13px] text-white/40 mt-1">{t("widgetsSubtitle")}</p>
      </div>

      <SettingsGroup title={t("groupActiveModules")}>
        {WIDGETS.map(({ key, icon: Icon, labelKey, bg }) => (
          <WidgetToggleRow
            key={key}
            icon={
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-lg ${bg} text-white`}
              >
                <Icon className="w-3.5 h-3.5" weight="Filled" />
              </div>
            }
            label={t(labelKey)}
            checked={settings[key]}
            onToggle={() => updateAndEmit(key, !settings[key])}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title={t("lblRightCorner")}>
        <div className="flex flex-col gap-3 py-3.5 px-4 bg-transparent">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">
              {t("lblRightCornerDesc")}
            </span>
          </div>
          <div className="flex bg-[#1c1c1e] rounded-xl p-0.5 border border-white/[0.08] w-full">
            {(["widgets", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateAndEmit("rightCornerMode", mode)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all duration-200 outline-none active:scale-[0.98] ${
                  settings.rightCornerMode === mode
                    ? "bg-[#3a3a3c] shadow-[0_1px_2px_rgba(0,0,0,0.2)] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {mode === "widgets"
                  ? t("rightCornerWidgets")
                  : t("rightCornerCustom")}
              </button>
            ))}
          </div>
        </div>

        {settings.rightCornerMode === "custom" && (
          <div className="flex flex-col gap-3 py-3.5 px-4 bg-transparent">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-white">
                {t("lblCustomUrl")}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.customRightCornerUrl}
                  onChange={(e) =>
                    updateAndEmit("customRightCornerUrl", e.target.value)
                  }
                  placeholder={t("phCustomUrl")}
                  aria-label={t("lblCustomUrl")}
                  className="flex-1 bg-[#1c1c1e] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:bg-[#1c1c1e] focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const selected = await open({
                        multiple: false,
                        filters: [
                          {
                            name: "Images",
                            extensions: [
                              "png",
                              "jpg",
                              "jpeg",
                              "gif",
                              "webp",
                              "bmp",
                              "svg",
                            ],
                          },
                        ],
                      });
                      if (selected) {
                        updateAndEmit(
                          "customRightCornerUrl",
                          convertFileSrc(selected),
                        );
                      }
                    } catch (e) {
                      console.error("File picker failed", e);
                    }
                  }}
                  className="bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all flex-shrink-0"
                >
                  {t("btnBrowse")}
                </button>
              </div>
            </div>

            {settings.customRightCornerUrl && (
              <div className="flex items-center justify-between gap-3 bg-[#1c1c1e] p-2.5 rounded-xl border border-white/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/[0.08] bg-white/5 flex items-center justify-center shrink-0">
                    <img
                      src={settings.customRightCornerUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-white truncate">
                      {settings.customRightCornerUrl.split("/").pop() ||
                        "image"}
                    </span>
                    <span className="text-[9px] text-white/40">
                      Image Preview
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateAndEmit("customRightCornerUrl", "")}
                  className="text-[10px] font-semibold text-[#ff453a] hover:text-[#ff453a] px-2.5 py-1 rounded-md hover:bg-[#ff453a]/15 transition-colors shrink-0"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("lblUpcomingExtensions")} disabled>
        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
              <Grid22 weight="Filled" className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">
                {t("lblQuickApps")}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/40 bg-[#3a3a3c] px-2 py-0.5 rounded select-none">
            {t("lblPlanned")}
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
              <TaskSquare2 weight="Filled" className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">
                {t("lblTodos")}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/40 bg-[#3a3a3c] px-2 py-0.5 rounded select-none">
            {t("lblPlanned")}
          </span>
        </div>
      </SettingsGroup>
    </m.div>
  );
}
