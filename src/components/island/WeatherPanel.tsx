import { m } from "framer-motion";
import { Compass, Wind, Droplets } from "lucide-react";
import { getWeatherIcon } from "../widgets/WeatherWidget";
import { ErrorBoundary } from "../ui/error-boundary";
import {
  useTranslation,
  getWeatherDescriptionKey,
} from "../../hooks/useTranslation";
import type { WeatherInfo } from "../../types";
import type { TargetAndTransition, Transition } from "framer-motion";

interface WeatherPanelProps {
  weatherInfo: WeatherInfo | null;
  weatherError: string | null;
  tabInitial: TargetAndTransition;
  tabExit: TargetAndTransition;
  tabTransition: Transition;
}

export function WeatherPanel({
  weatherInfo,
  weatherError,
  tabInitial,
  tabExit,
  tabTransition,
}: WeatherPanelProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary>
      <m.div
        key="weather"
        initial={tabInitial}
        animate={{ opacity: 1, y: 0, filter: "none" }}
        exit={tabExit}
        transition={tabTransition}
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
      </m.div>
    </ErrorBoundary>
  );
}
