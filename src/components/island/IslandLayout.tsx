import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { TAB_ANIMATION, MODE_TRANSITION } from "../../lib/animation-config";
import { ErrorBoundary } from "../ui/error-boundary";
import { Setting22 } from "reicon-react";
import { MusicWidget } from "../widgets/MusicWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { SystemWidget } from "../widgets/SystemWidget";
import { MicWidget } from "../widgets/MicWidget";
import { TrayWidget } from "../widgets/TrayWidget";
import { useIslandStore } from "../../stores/island-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useTrayStore } from "../../stores/tray-store";
import { openSettingsWindow } from "../../lib/tauri-commands";
import type { IslandMode } from "../../types";
import { useTabFallback } from "../../hooks/useTabFallback";
import { TabBar } from "./TabBar";
import { CompactContent } from "./CompactContent";
import { WeatherPanel } from "./WeatherPanel";
import { useLoadedPlugins } from "../../plugins/plugin-store";
import { PluginExpandedPanel } from "../../plugins/PluginExpandedPanel";

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
  const reduce = useReducedMotion();

  const hasHomeTab = showMusic || showCalendar;
  const hasSystemTab = showSystem;
  const hasWeatherTab = showWeather;
  const hasTrayTab = showTray;

  // Dynamic plugin tabs (plugins with an expanded view become tabs)
  const loadedPlugins = useLoadedPlugins();
  const pluginTabs = loadedPlugins.filter((p) => p.expanded != null);

  const tabTransition = reduce ? { duration: 0 } : TAB_ANIMATION.transition;
  const tabInitial = reduce
    ? { opacity: 1, y: 0, filter: "none" }
    : TAB_ANIMATION.initial;
  const tabExit = reduce
    ? { opacity: 0, y: 0, filter: "none" }
    : TAB_ANIMATION.exit;

  const modeTransition = reduce ? { duration: 0 } : MODE_TRANSITION;

  const shouldShowTrayCompactSummary =
    mode === "compact" &&
    activeTab === "tray" &&
    hasTrayTab &&
    trayFileCount > 0;
  const trayCompactCount = trayFileCount > 99 ? "99+" : String(trayFileCount);

  useTabFallback(
    activeTab,
    hasHomeTab,
    hasSystemTab,
    hasWeatherTab,
    hasTrayTab,
    setActiveTab,
  );

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* ── Compact Mode ── */}
      {mode === "compact" && (
        <CompactContent
          showMusic={showMusic}
          mediaInfo={mediaInfo}
          showClock={showClock}
          showMic={showMic}
          micStatus={micStatus}
          showWeather={showWeather}
          weatherInfo={weatherInfo}
          weatherError={weatherError}
          showSystem={showSystem}
          systemStats={systemStats}
          rightCornerMode={rightCornerMode}
          customRightCornerUrl={customRightCornerUrl}
          shouldShowTrayCompactSummary={shouldShowTrayCompactSummary}
          trayCompactCount={trayCompactCount}
          modeTransition={modeTransition}
          reduce={reduce}
        />
      )}

      {/* ── Expanded Mode ── */}
      {mode === "expanded" && (
        <m.div
          key="expanded"
          initial={
            reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduce ? { duration: 0 } : { ...MODE_TRANSITION, delay: 0.1 }
          }
          className="absolute inset-0 flex flex-col p-4"
        >
          <div className="flex flex-col h-full">
            {/* Header Bar with Tab Navigation */}
            <div className="flex justify-between items-center w-full mb-3 px-1">
              <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasHomeTab={hasHomeTab}
                hasTrayTab={hasTrayTab}
                hasSystemTab={hasSystemTab}
                hasWeatherTab={hasWeatherTab}
                pluginTabs={pluginTabs}
              />
              <div className="flex items-center gap-1 text-white/50 pr-1">
                {showMic && (
                  <ErrorBoundary>
                    <MicWidget micStatus={micStatus} variant="header" />
                  </ErrorBoundary>
                )}
                <m.button
                  type="button"
                  onClick={() => openSettingsWindow()}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", duration: 0.15, bounce: 0 }}
                  className="hover:text-white transition-colors focus:outline-none p-1.5 rounded-full hover:bg-white/[0.04]"
                >
                  <Setting22 size={14} />
                </m.button>
              </div>
            </div>

            {/* Tab Contents with AnimatePresence Transitions */}
            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                {activeTab === "home" && hasHomeTab && (
                  <m.div
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
                  </m.div>
                )}

                {activeTab === "system" && hasSystemTab && (
                  <m.div
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
                  </m.div>
                )}

                {activeTab === "weather" && hasWeatherTab && (
                  <WeatherPanel
                    weatherInfo={weatherInfo}
                    weatherError={weatherError}
                    tabInitial={tabInitial}
                    tabExit={tabExit}
                    tabTransition={tabTransition}
                  />
                )}

                {activeTab === "tray" && hasTrayTab && (
                  <m.div
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
                  </m.div>
                )}

                {/* Dynamic plugin tabs */}
                {pluginTabs.map((plugin) =>
                  activeTab === plugin.manifest.id ? (
                    <m.div
                      key={plugin.manifest.id}
                      initial={tabInitial}
                      animate={{ opacity: 1, y: 0, filter: "none" }}
                      exit={tabExit}
                      transition={tabTransition}
                      className="flex flex-col flex-1 min-h-0 py-1 h-full"
                    >
                      <PluginExpandedPanel pluginId={plugin.manifest.id} />
                    </m.div>
                  ) : null
                )}
              </AnimatePresence>
            </div>
          </div>
        </m.div>
      )}
    </div>
  );
}
