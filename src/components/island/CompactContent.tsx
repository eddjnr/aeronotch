import { m } from "framer-motion";
import { Equalizer } from "./Equalizer";
import { ClockWidget } from "../widgets/ClockWidget";
import { MicWidget } from "../widgets/MicWidget";
import { WeatherWidget } from "../widgets/WeatherWidget";
import { SystemWidget } from "../widgets/SystemWidget";
import { ErrorBoundary } from "../ui/error-boundary";
import { Folder, File } from "lucide-react";
import type { MediaInfo, MicStatus, WeatherInfo, SystemStats } from "../../types";
import type { RightCornerMode } from "../../types";

interface CompactContentProps {
  showMusic: boolean;
  mediaInfo: MediaInfo | null;
  showClock: boolean;
  showMic: boolean;
  micStatus: MicStatus | null;
  showWeather: boolean;
  weatherInfo: WeatherInfo | null;
  weatherError: string | null;
  showSystem: boolean;
  systemStats: SystemStats | null;
  rightCornerMode: RightCornerMode;
  customRightCornerUrl: string;
  shouldShowTrayCompactSummary: boolean;
  trayCompactCount: string;
  modeTransition: Record<string, unknown>;
  reduce: boolean | null;
}

export function CompactContent({
  showMusic,
  mediaInfo,
  showClock,
  showMic,
  micStatus,
  showWeather,
  weatherInfo,
  weatherError,
  showSystem,
  systemStats,
  rightCornerMode,
  customRightCornerUrl,
  shouldShowTrayCompactSummary,
  trayCompactCount,
  modeTransition,
  reduce,
}: CompactContentProps) {
  return (
    <m.div
      key="compact"
      initial={
        reduce
          ? { opacity: 1, filter: "none" }
          : { opacity: 0, filter: "blur(4px)" }
      }
      animate={{ opacity: 1, filter: "none" }}
      transition={modeTransition}
      className="absolute inset-0 flex items-center justify-between whitespace-nowrap px-3"
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
    </m.div>
  );
}
