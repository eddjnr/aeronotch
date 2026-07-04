import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "../../lib/animation-config";
import { ErrorBoundary } from "../ui/error-boundary";
import { ClockWidget } from "../widgets/ClockWidget";
import { MusicWidget } from "../widgets/MusicWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { SystemWidget } from "../widgets/SystemWidget";
import { WeatherWidget, getWeatherIcon } from "../widgets/WeatherWidget";
import { MicWidget } from "../widgets/MicWidget";
import { Equalizer } from "./Equalizer";
import {
  Settings,
  Home,
  Cpu,
  Cloud,
  Compass,
  Wind,
  Droplets,
  Folder,
  File,
} from "lucide-react";
import { useIslandStore } from "../../stores/island-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useTrayStore } from "../../stores/tray-store";
import { openSettingsWindow } from "../../lib/tauri-commands";
import type { IslandMode } from "../../types";
import {
  useTranslation,
  getWeatherDescriptionKey,
} from "../../hooks/useTranslation";
import { TrayWidget } from "../widgets/TrayWidget";

interface IslandLayoutProps {
  mode: IslandMode;
}

export function IslandLayout({ mode }: IslandLayoutProps) {
  const {
    mediaInfo,
    systemStats,
    weatherInfo,
    weatherError,
    micStatus,
    activeTab,
    setActiveTab,
  } = useIslandStore();
  const showMusic = useSettingsStore((s) => s.showMusic);
  const showCalendar = useSettingsStore((s) => s.showCalendar);
  const showSystem = useSettingsStore((s) => s.showSystem);
  const showWeather = useSettingsStore((s) => s.showWeather);
  const showTray = useSettingsStore((s) => s.showTray);
  const showClock = useSettingsStore((s) => s.showClock);
  const showMic = useSettingsStore((s) => s.showMic);
  const rightCornerMode = useSettingsStore((s) => s.rightCornerMode);
  const customRightCornerUrl = useSettingsStore((s) => s.customRightCornerUrl);
  const trayFileCount = useTrayStore((state) => state.files.length);
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  // Determine active tabs based on widget visibility settings
  const hasHomeTab = showMusic || showCalendar;
  const hasSystemTab = showSystem;
  const hasWeatherTab = showWeather;
  const hasTrayTab = showTray;

  const tabTransition = reduce
    ? { duration: 0 }
    : { duration: 0.14, ease: EASE.out };

  const tabInitial = reduce
    ? { opacity: 1, y: 0, filter: "none" }
    : { opacity: 0, y: 6, filter: "blur(4px)" };

  const tabExit = reduce
    ? { opacity: 0, y: 0, filter: "none" }
    : { opacity: 0, y: -6, filter: "blur(4px)" };

  const modeTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };

  const shouldShowTrayCompactSummary =
    mode === "compact" &&
    activeTab === "tray" &&
    hasTrayTab &&
    trayFileCount > 0;
  const trayCompactCount = trayFileCount > 99 ? "99+" : String(trayFileCount);

  // Enforce correct tab focus fallback when widget visibility changes in settings
  useEffect(() => {
    if (activeTab === "home" && !hasHomeTab) {
      if (hasSystemTab) setActiveTab("system");
      else if (hasWeatherTab) setActiveTab("weather");
      else if (hasTrayTab) setActiveTab("tray");
    } else if (activeTab === "system" && !hasSystemTab) {
      if (hasHomeTab) setActiveTab("home");
      else if (hasWeatherTab) setActiveTab("weather");
      else if (hasTrayTab) setActiveTab("tray");
    } else if (activeTab === "weather" && !hasWeatherTab) {
      if (hasHomeTab) setActiveTab("home");
      else if (hasSystemTab) setActiveTab("system");
      else if (hasTrayTab) setActiveTab("tray");
    } else if (activeTab === "tray" && !hasTrayTab) {
      if (hasHomeTab) setActiveTab("home");
      else if (hasSystemTab) setActiveTab("system");
      else if (hasWeatherTab) setActiveTab("weather");
    }
  }, [
    activeTab,
    hasHomeTab,
    hasSystemTab,
    hasWeatherTab,
    hasTrayTab,
    setActiveTab,
  ]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* ── Compact Mode ── */}
      {mode === "compact" && (
        <motion.div
          key="compact"
          initial={
            reduce
              ? { opacity: 1, filter: "none" }
              : { opacity: 0, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, filter: "none" }}
          transition={modeTransition}
          className={
            "absolute inset-0 flex items-center justify-between whitespace-nowrap px-3"
          }
        >
          {shouldShowTrayCompactSummary ? (
            <>
              <div className="flex items-center gap-3">
                {showMusic && mediaInfo?.is_playing && (
                  <Equalizer isPlaying={true} />
                )}
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                  <Folder className="h-3 w-3 text-white" strokeWidth={2.4} />
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-white">
                {showMic && (
                  <ErrorBoundary>
                    <MicWidget micStatus={micStatus} variant="compact" />
                  </ErrorBoundary>
                )}
                <span className="min-w-[0.75rem] text-right text-[11px] font-bold leading-none tabular-nums">
                  {trayCompactCount}
                </span>
                <File className="h-3.5 w-3.5" strokeWidth={2.35} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {showMusic && mediaInfo?.is_playing && (
                  <Equalizer isPlaying={true} />
                )}
                {showClock && (
                  <ErrorBoundary>
                    <ClockWidget mode="compact" />
                  </ErrorBoundary>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {showMic && (
                  <ErrorBoundary>
                    <MicWidget micStatus={micStatus} variant="compact" />
                  </ErrorBoundary>
                )}
                {rightCornerMode === "custom" && customRightCornerUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={customRightCornerUrl}
                      alt=""
                      className="h-5 max-w-[60px] object-contain rounded-sm"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {showWeather && (
                      <ErrorBoundary>
                        <WeatherWidget
                          weather={weatherInfo}
                          mode="compact"
                          error={weatherError}
                        />
                      </ErrorBoundary>
                    )}
                    {showSystem && (
                      <ErrorBoundary>
                        <SystemWidget stats={systemStats} mode="compact" />
                      </ErrorBoundary>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ── Preview Mode ── */}
      {mode === "preview" && (
        <motion.div
          key="preview"
          initial={
            reduce
              ? { opacity: 1, filter: "none" }
              : { opacity: 0, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, filter: "none" }}
          transition={modeTransition}
          className="absolute inset-0 flex items-center justify-between px-4 whitespace-nowrap"
        >
          <div className="flex items-center gap-3">
            {showMusic && (
              <ErrorBoundary>
                <MusicWidget media={mediaInfo} mode="preview" />
              </ErrorBoundary>
            )}
            {showMusic && mediaInfo?.is_playing && (
              <Equalizer isPlaying={true} />
            )}
          </div>
          <div className="flex items-center gap-3">
            {showMic && (
              <ErrorBoundary>
                <MicWidget micStatus={micStatus} variant="preview" />
              </ErrorBoundary>
            )}
            {showClock && (
              <ErrorBoundary>
                <ClockWidget mode="preview" />
              </ErrorBoundary>
            )}
            {showSystem && (
              <ErrorBoundary>
                <SystemWidget stats={systemStats} mode="preview" />
              </ErrorBoundary>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Expanded Mode ── */}
      {mode === "expanded" && (
        <motion.div
          key="expanded"
          initial={
            reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 30, delay: 0.1 }
          }
          className="absolute inset-0 flex flex-col p-4"
        >
          <div className="flex flex-col h-full">
            {/* Header Bar with Tab Navigation */}
            <div className="flex justify-between items-center w-full mb-3 px-1">
              <div className="flex items-center gap-1 relative">
                {hasHomeTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("home")}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === "home"
                        ? "text-white font-bold"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {activeTab === "home" && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 28,
                        }}
                      />
                    )}
                    <Home className="w-3.5 h-3.5" />
                    {/* <span>{t("layHome")}</span> */}
                  </button>
                )}
                {hasTrayTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("tray")}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === "tray"
                        ? "text-white font-bold"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {activeTab === "tray" && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 28,
                        }}
                      />
                    )}
                    <Folder className="w-3.5 h-3.5" />
                    {/* <span>{t("layTray")}</span> */}
                  </button>
                )}
                {hasSystemTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("system")}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === "system"
                        ? "text-white font-bold"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {activeTab === "system" && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 28,
                        }}
                      />
                    )}
                    <Cpu className="w-3.5 h-3.5" />
                    {/* <span>{t("laySystem")}</span> */}
                  </button>
                )}
                {hasWeatherTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("weather")}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === "weather"
                        ? "text-white font-bold"
                        : "text-white/45 hover:text-white/60"
                    }`}
                  >
                    {activeTab === "weather" && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 28,
                        }}
                      />
                    )}
                    <Cloud className="w-3.5 h-3.5" />
                    {/* <span>{t("layWeather")}</span> */}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-white/50 pr-1">
                {showMic && (
                  <ErrorBoundary>
                    <MicWidget micStatus={micStatus} variant="header" />
                  </ErrorBoundary>
                )}
                <motion.button
                  type="button"
                  onClick={() => openSettingsWindow()}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", duration: 0.15, bounce: 0 }}
                  className="hover:text-white transition-colors cursor-pointer focus:outline-none p-1.5 rounded-full hover:bg-white/[0.04]"
                >
                  <Settings className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>

            {/* Tab Contents with AnimatePresence Transitions */}
            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                {activeTab === "home" && hasHomeTab && (
                  <motion.div
                    key="home"
                    initial={tabInitial}
                    animate={{ opacity: 1, y: 0, filter: "none" }}
                    exit={tabExit}
                    transition={tabTransition}
                    className={`grid gap-4 h-full ${
                      showMusic && showCalendar
                        ? "grid-cols-[1.2fr_1fr]"
                        : "grid-cols-1"
                    }`}
                  >
                    {/* Tab 1: Home (Music, Calendar) */}
                    {showMusic && (
                      <div className="flex flex-col min-w-0">
                        <ErrorBoundary>
                          <MusicWidget media={mediaInfo} mode="expanded" />
                        </ErrorBoundary>
                      </div>
                    )}
                    {showCalendar && (
                      <div className="flex flex-col gap-3 justify-between">
                        <ErrorBoundary>
                          <CalendarWidget mode="expanded" />
                        </ErrorBoundary>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "system" && hasSystemTab && (
                  <motion.div
                    key="system"
                    initial={tabInitial}
                    animate={{ opacity: 1, y: 0, filter: "none" }}
                    exit={tabExit}
                    transition={tabTransition}
                    className="flex flex-col flex-1 min-h-0 py-1.5 h-full"
                  >
                    <ErrorBoundary>
                      <SystemWidget stats={systemStats} mode="expanded" />
                    </ErrorBoundary>
                  </motion.div>
                )}

                {activeTab === "weather" && hasWeatherTab && (
                  <ErrorBoundary>
                    <motion.div
                      key="weather"
                      initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                      animate={{ opacity: 1, y: 0, filter: "none" }}
                      exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                      transition={{ duration: 0.14, ease: "easeInOut" }}
                      className="grid grid-cols-[1.1fr_1px_1fr] gap-4 flex-1 min-h-0 py-1.5 px-2 h-full"
                    >
                      {/* Left Column: Temperature and status icon */}
                      <div className="flex items-center gap-4 justify-center">
                        {weatherInfo ? (
                          <>
                            <div className="flex-shrink-0">
                              {getWeatherIcon(
                                weatherInfo.weather_code,
                                weatherInfo.is_day,
                                "w-12 h-12",
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-3xl font-bold text-white tracking-tight leading-none">
                                {Math.round(weatherInfo.temperature)}°C
                              </span>
                              <span className="text-[11px] font-medium text-white/60 mt-1">
                                {t(
                                  getWeatherDescriptionKey(
                                    weatherInfo.weather_code,
                                  ) as any,
                                )}
                              </span>
                            </div>
                          </>
                        ) : weatherError ? (
                          <div className="text-white/30 text-xs text-center">
                            {t("weatherUnstable")}
                          </div>
                        ) : (
                          <div className="text-white/30 text-xs">
                            {t("layLoadingWeather")}
                          </div>
                        )}
                      </div>

                      {/* Vertical separator */}
                      <div className="w-[1px] bg-white/[0.06] h-[90%] self-center" />

                      {/* Right Column: Weather stats details */}
                      <div className="flex flex-col justify-between h-full">
                        <span className="text-[10px] font-semibold text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                          <Compass className="w-3.5 h-3.5 text-white/35" />
                          {t("layConditionDetails")}
                        </span>
                        {weatherInfo ? (
                          <div className="flex flex-col gap-2 flex-1 justify-center">
                            <div className="flex justify-between items-center text-[10px] text-white/50 border-b border-white/[0.06] pb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Droplets className="w-3.5 h-3.5 text-white/35" />
                                {t("layHumidity")}
                              </span>
                              <span className="text-white/80 font-medium">
                                {weatherInfo.humidity}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-white/50 border-b border-white/[0.06] pb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Wind className="w-3.5 h-3.5 text-white/35" />
                                {t("layWindSpeed")}
                              </span>
                              <span className="text-white/80 font-medium">
                                {weatherInfo.wind_speed} km/h
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-white/50 pt-0.5">
                              <span className="text-white/50">
                                {t("layThermalSensation")}
                              </span>
                              <span className="text-white/80 font-medium">
                                {Math.round(weatherInfo.apparent_temperature)}°
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/30 text-xs text-center flex-1 flex items-center justify-center">
                            {weatherError ? t("weatherUnstable") : "--"}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </ErrorBoundary>
                )}

                {activeTab === "tray" && hasTrayTab && (
                  <motion.div
                    key="tray"
                    initial={tabInitial}
                    animate={{ opacity: 1, y: 0, filter: "none" }}
                    exit={tabExit}
                    transition={tabTransition}
                    className="flex flex-col flex-1 min-h-0 py-1 h-full"
                  >
                    <ErrorBoundary>
                      <TrayWidget />
                    </ErrorBoundary>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
