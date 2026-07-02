import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import { useTranslation } from "../../hooks/useTranslation";
import {
  Music,
  Calendar,
  Activity,
  Cloud,
  Clock,
  Grid,
  ListTodo,
  Info,
  Settings,
  LayoutGrid,
  HeartHandshake,
  RotateCcw,
  Link2,
} from "lucide-react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { emit } from "@tauri-apps/api/event";
import { SpinningText } from "@/components/ui/spinnig-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  GoogleCalendarStatus,
} from "../../lib/tauri-commands";

// Custom macOS/iOS Style Toggle Switch
function IOSSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer relative ${
        checked ? "bg-[#007aff]" : "bg-[#d1d1d6]"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const settings = useSettingsStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "general" | "widgets" | "integrations" | "about"
  >("general");
  const [autostart, setAutostart] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(
    null,
  );
  const [calendarUrl, setCalendarUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load Autostart status on mount
  useEffect(() => {
    async function checkAutostart() {
      try {
        setAutostart(await isEnabled());
      } catch (e) {
        console.warn("Autostart plugin not fully loaded in browser", e);
      }
    }
    checkAutostart();

    // Fetch google calendar status on mount
    getGoogleCalendarStatus()
      .then((status) => {
        setGoogleStatus(status);
        if (status.connected && status.url) {
          setCalendarUrl(status.url);
        }
      })
      .catch(console.error);
  }, []);

  const handleConnectGoogle = async () => {
    if (!calendarUrl.trim()) {
      setConnectionError("Please enter a valid iCal/ICS URL.");
      return;
    }
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await connectGoogleCalendar(calendarUrl.trim());
      setGoogleStatus({ connected: true, url: calendarUrl.trim() });
    } catch (e) {
      setConnectionError(String(e));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleCalendar();
      setGoogleStatus({ connected: false });
      setCalendarUrl("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutostart = async () => {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch (e) {
      console.error("Failed to toggle autostart", e);
    }
  };

  const handleToggleWidget = (
    key:
      | "showMusic"
      | "showCalendar"
      | "showSystem"
      | "showWeather"
      | "showClock",
  ) => {
    const nextValue = !settings[key];
    settings.updateSetting(key, nextValue);
    emit("settings-changed", { key, value: nextValue }).catch(console.error);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = parseFloat(e.target.value);
    settings.updateSetting("opacity", nextValue);
    emit("settings-changed", { key: "opacity", value: nextValue }).catch(
      console.error,
    );
  };

  const handlePositionChange = (
    pos: "top-left" | "top-center" | "top-right",
  ) => {
    settings.updateSetting("position", pos);
    emit("settings-changed", { key: "position", value: pos }).catch(
      console.error,
    );
  };

  const handleLanguageChange = (lang: "en" | "pt-BR") => {
    settings.updateSetting("language", lang);
    emit("settings-changed", { key: "language", value: lang }).catch(
      console.error,
    );
  };

  const handleResetSettings = () => {
    settings.resetSettings();
    // Emit all defaults to synchronize island in real-time
    const defaults = {
      position: "top-center",
      showMusic: true,
      showCalendar: true,
      showSystem: true,
      showWeather: true,
      showClock: true,
      opacity: 0.92,
      language: "en",
    };
    Object.entries(defaults).forEach(([key, value]) => {
      emit("settings-changed", { key, value }).catch(console.error);
    });
  };

  return (
    <div className="flex h-full w-full bg-[#f5f5f7] text-[#1d1d1f] font-sans overflow-hidden">
      {/* LEFT SIDEBAR (Primary Navigation) */}
      <div className="w-48 bg-[#e8e8ea] border-r border-[#d9d9d9] flex flex-col justify-between flex-shrink-0 select-none">
        <div className="flex flex-col pt-6 px-3">
          {/* Brand Identity Header */}
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

          {/* Navigation Items */}
          <nav className="flex flex-col gap-0.5">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "general"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Settings
                className={`w-4 h-4 ${
                  activeTab === "general" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>{t("tabGeneral")}</span>
            </button>

            <button
              onClick={() => setActiveTab("widgets")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "widgets"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <LayoutGrid
                className={`w-4 h-4 ${
                  activeTab === "widgets" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>{t("tabWidgets")}</span>
            </button>

            <button
              onClick={() => setActiveTab("integrations")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "integrations"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Link2
                className={`w-4 h-4 ${
                  activeTab === "integrations" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>{t("tabIntegrations")}</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "about"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Info
                className={`w-4 h-4 ${
                  activeTab === "about" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>{t("tabAbout")}</span>
            </button>
          </nav>
        </div>

        {/* Footer Credit */}
        <div className="p-4 border-t border-[#d9d9d9]/60 flex items-center justify-between text-[9px] text-[#86868b] font-medium leading-none">
          <span>AeroNotch v0.1.0</span>
          <HeartHandshake className="w-3 h-3 text-[#ff2d55]" />
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-10 py-8 select-none">
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-6 max-w-lg"
            >
              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
                  {t("generalTitle")}
                </h1>
                <p className="text-[13px] text-[#86868b] mt-1">
                  {t("generalSubtitle")}
                </p>
              </div>

              {/* iOS-Style Settings Group (Appearance) */}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
                  {t("groupAppearance")}
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Screen Position */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        {t("lblScreenPosition")}
                      </span>
                      <span className="text-xs text-[#86868b] mt-0.5">
                        {t("descScreenPosition")}
                      </span>
                    </div>
                    <div className="flex bg-[#e8e8ea] rounded-lg p-0.5 border border-black/5">
                      {(["top-left", "top-center", "top-right"] as const).map(
                        (pos) => (
                          <button
                            key={pos}
                            onClick={() => handlePositionChange(pos)}
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
                        ),
                      )}
                    </div>
                  </div>

                  {/* Island Opacity */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        {t("lblOpacity")}
                      </span>
                      <span className="text-xs text-[#86868b] mt-0.5">
                        {t("descOpacity")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-40">
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={settings.opacity}
                        onChange={handleOpacityChange}
                        className="flex-1 h-1 bg-[#e8e8ea] rounded-lg appearance-none cursor-pointer accent-[#007aff] outline-none"
                      />
                      <span className="font-semibold text-xs text-[#1d1d1f] w-8 text-right">
                        {Math.round(settings.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* iOS-Style Settings Group (Language) */}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
                  {t("groupLanguage")}
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        {t("lblLanguage")}
                      </span>
                      <span className="text-xs text-[#86868b] mt-0.5">
                        {t("descLanguage")}
                      </span>
                    </div>
                    <Select
                      value={settings.language || "en"}
                      onValueChange={(val) =>
                        handleLanguageChange(val as "en" | "pt-BR")
                      }
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
                </div>
              </div>

              {/* iOS-Style Settings Group (System) */}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
                  {t("groupSystem")}
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Launch on Startup */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        {t("lblLaunchStartup")}
                      </span>
                      <span className="text-xs text-[#86868b] mt-0.5">
                        {t("descLaunchStartup")}
                      </span>
                    </div>
                    <IOSSwitch
                      checked={autostart}
                      onChange={handleToggleAutostart}
                    />
                  </div>

                  {/* Reset Defaults */}
                  <div className="flex items-center justify-between p-4 bg-white hover:bg-red-50/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        {t("lblResetDefaults")}
                      </span>
                      <span className="text-xs text-[#86868b] mt-0.5">
                        {t("descResetDefaults")}
                      </span>
                    </div>
                    <button
                      onClick={handleResetSettings}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-xs font-semibold transition-all cursor-pointer outline-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t("btnResetSettings")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "widgets" && (
            <motion.div
              key="widgets"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-6 max-w-lg"
            >
              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
                  {t("widgetsTitle")}
                </h1>
                <p className="text-[13px] text-[#86868b] mt-1">
                  {t("widgetsSubtitle")}
                </p>
              </div>

              {/* iOS-Style Settings Group (Widgets List) */}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
                  {t("groupActiveModules")}
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Media Player */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#ff2d55] text-white shadow-[0_1px_3px_rgba(255,45,85,0.3)] flex-shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblMusicWidget")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descMusicWidget")}
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showMusic}
                      onChange={() => handleToggleWidget("showMusic")}
                    />
                  </div>

                  {/* Calendar Grid */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#ff9500] text-white shadow-[0_1px_3px_rgba(255,149,0,0.3)] flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblCalendarWidget")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descCalendarWidget")}
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showCalendar}
                      onChange={() => handleToggleWidget("showCalendar")}
                    />
                  </div>

                  {/* System Monitors */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#34c759] text-white shadow-[0_1px_3px_rgba(52,199,89,0.3)] flex-shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblSystemWidget")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descSystemWidget")}
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showSystem}
                      onChange={() => handleToggleWidget("showSystem")}
                    />
                  </div>

                  {/* Weather Details */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#5ac8fa] text-white shadow-[0_1px_3px_rgba(90,200,250,0.3)] flex-shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblWeatherWidget")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descWeatherWidget")}
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showWeather}
                      onChange={() => handleToggleWidget("showWeather")}
                    />
                  </div>

                  {/* Digital Clock */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#5856d6] text-white shadow-[0_1px_3px_rgba(88,86,214,0.3)] flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblClockWidget")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descClockWidget")}
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showClock}
                      onChange={() => handleToggleWidget("showClock")}
                    />
                  </div>
                </div>
              </div>

              {/* iOS-Style Settings Group (Upcoming Lists) */}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
                  {t("lblUpcomingExtensions")}
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden opacity-45 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Quick Apps */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
                        <Grid className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblQuickApps")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descQuickApps")}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#86868b] bg-[#e8e8ea] px-2 py-0.5 rounded uppercase tracking-wider select-none">
                      {t("lblPlanned")}
                    </span>
                  </div>

                  {/* To-dos */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
                        <ListTodo className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          {t("lblTodos")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {t("descTodos")}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#86868b] bg-[#e8e8ea] px-2 py-0.5 rounded uppercase tracking-wider select-none">
                      {t("lblPlanned")}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "integrations" && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-6 max-w-lg"
            >
              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
                  {t("integrationsTitle")}
                </h1>
                <p className="text-[13px] text-[#86868b] mt-1">
                  {t("integrationsSubtitle")}
                </p>
              </div>

              {/* Service Cards */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden p-5 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#007aff] text-white flex-shrink-0 shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#1d1d1f]">
                          {t("lblCalendarSub")}
                        </span>
                        <span className="text-xs text-[#86868b] mt-0.5">
                          {googleStatus?.connected
                            ? t("descCalendarSubConnected")
                            : t("descCalendarSubDisconnected")}
                        </span>
                      </div>
                    </div>

                    <div>
                      {googleStatus?.connected && (
                        <button
                          onClick={handleDisconnectGoogle}
                          className="bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          {t("btnDisconnect")}
                        </button>
                      )}
                    </div>
                  </div>

                  {!googleStatus?.connected ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-[#555557]">
                        {t("lblSecretIcsAddress")}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={calendarUrl}
                          onChange={(e) => setCalendarUrl(e.target.value)}
                          placeholder={t("phIcsLink")}
                          className="flex-1 bg-[#f5f5f7] border border-black/10 rounded-lg px-3 py-2 text-xs text-[#1d1d1f] placeholder:text-[#86868b] outline-none focus:bg-white focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all"
                        />
                        <button
                          onClick={handleConnectGoogle}
                          disabled={isConnecting}
                          className="bg-[#007aff] hover:bg-[#0062cc] disabled:bg-[#007aff]/50 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          {isConnecting
                            ? t("btnSyncing")
                            : t("btnSyncCalendar")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#f5f5f7] p-4 rounded-lg border border-black/5 flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] text-[#86868b] font-bold block uppercase tracking-wider">
                          {t("lblSyncedLink")}
                        </span>
                        <span className="text-xs text-[#1d1d1f] break-all block mt-1 font-mono bg-white p-2.5 rounded-md border border-black/5 select-text">
                          {googleStatus.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#34c759] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
                        {t("lblActiveSync")}
                      </div>
                    </div>
                  )}

                  {connectionError && (
                    <div className="p-3 bg-[#ff3b30]/5 text-[#ff3b30] text-xs rounded-lg border border-[#ff3b30]/15">
                      {connectionError}
                    </div>
                  )}

                  {/* Guideline instructions */}
                  <div className="border-t border-black/5 pt-4">
                    <span className="text-xs font-semibold text-[#1d1d1f] block mb-2">
                      {t("instructionsTitle")}
                    </span>
                    <ol className="text-xs text-[#555557] leading-relaxed list-decimal list-inside flex flex-col gap-1.5">
                      <li>
                        Open{" "}
                        <strong className="text-[#1d1d1f]">
                          {t("lblGoogleCalendar")}
                        </strong>{" "}
                        in your web browser.
                      </li>
                      <li>
                        Hover over your calendar name in the left list, click
                        the <strong className="text-[#1d1d1f]">3 dots</strong>{" "}
                        icon, and choose{" "}
                        <strong className="text-[#1d1d1f]">
                          {t("instructionStep2").split("choose ")[1] ||
                            "Settings and sharing"}
                        </strong>
                        .
                      </li>
                      <li>
                        Scroll down to the{" "}
                        <strong className="text-[#1d1d1f]">
                          {t("instructionStep3")
                            .split("to the ")[1]
                            ?.split(" section")[0] || "Integrate calendar"}
                        </strong>{" "}
                        section and copy the{" "}
                        <strong className="text-[#1d1d1f]">
                          {t("instructionStep3").split("copy the ")[1] ||
                            "Secret address in iCal format"}
                        </strong>
                        .
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center justify-center text-center gap-4 py-8 select-none"
            >
              {/* Logo container with spinning text */}
              <div className="relative w-44 h-44 flex items-center justify-center mb-1">
                <img
                  src="/logo.png"
                  alt="AeroNotch Logo"
                  className="w-16 h-16 rounded-2xl object-cover z-10 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/20 select-none pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <SpinningText
                    radius={5.5}
                    fontSize={0.8}
                    variants={{
                      container: {
                        hidden: {
                          opacity: 1,
                        },
                        visible: {
                          opacity: 1,
                          rotate: 360,
                          transition: {
                            type: "spring",
                            bounce: 0,
                            duration: 8,
                            repeat: Infinity,
                            staggerChildren: 0.03,
                          },
                        },
                      },
                      item: {
                        hidden: {
                          opacity: 0,
                          filter: "blur(4px)",
                        },
                        visible: {
                          opacity: 1,
                          filter: "blur(0px)",
                        },
                      },
                    }}
                    className="font-bold text-[#86868b] uppercase tracking-[0.05em]"
                  >{`aeronotch • powered by • ed • `}</SpinningText>
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
                  AeroNotch
                </h1>
                <span className="text-[10px] text-[#86868b] font-semibold leading-none mt-1 inline-block">
                  {t("lblVersion")}
                </span>
              </div>

              <p className="text-xs text-[#515154] max-w-sm leading-relaxed mt-1">
                {t("lblDescription")}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-[#86868b] mt-4">
                <HeartHandshake className="w-4 h-4 text-[#ff2d55]" />
                <span>{t("lblBuiltWith")}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
