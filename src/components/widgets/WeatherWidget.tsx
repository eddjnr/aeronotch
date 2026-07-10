import type { WeatherInfo, IslandMode } from "../../types";
import {
  useTranslation,
  getWeatherDescriptionKey,
} from "../../hooks/useTranslation";
import {
  Snowflake,
  CloudSun2,
  CloudRain,
  Cloud,
  Moon3,
  MoonCloud,
  Sun,
  CloudX,
  CloudSnow,
  CloudBolt,
  Fog,
} from "reicon-react";

interface WeatherWidgetProps {
  weather: WeatherInfo | null;
  mode: IslandMode;
  error?: string | null;
}

export function getWeatherIcon(
  code: number,
  isDay: boolean,
  compact: boolean = false,
) {
  if (code === 0 || code === 1) {
    return isDay ? (
      <Sun
        size={compact ? 16 : 44}
        className={`text-amber-400!`}
        weight="Filled"
      />
    ) : (
      <Moon3
        size={compact ? 13 : 44}
        className={`text-indigo-200!`}
        weight="Filled"
      />
    );
  }
  if (code === 2) {
    return isDay ? (
      <CloudSun2 size={compact ? 16 : 44} className={`text-amber-400/80!`} />
    ) : (
      <MoonCloud size={compact ? 13 : 44} className={`text-indigo-300/80!`} />
    );
  }
  if (code === 3)
    return <Cloud size={compact ? 13 : 44} className={`text-white/60!`} />;
  if (code >= 45 && code <= 48)
    return <Fog size={compact ? 13 : 44} className={`text-white/50!`} />;
  if (code >= 51 && code <= 57)
    return <CloudRain size={compact ? 13 : 44} className={`text-blue-300!`} />;
  if (code >= 61 && code <= 67)
    return <CloudRain size={compact ? 13 : 44} className={`text-blue-400!`} />;
  if (code >= 71 && code <= 77)
    return <CloudSnow size={compact ? 13 : 44} className={`text-white/70!`} />;
  if (code >= 80 && code <= 82)
    return <CloudRain size={compact ? 13 : 44} className={`text-blue-400!`} />;
  if (code >= 85 && code <= 86)
    return <Snowflake size={compact ? 13 : 44} className={`text-blue-200!`} />;
  if (code >= 95)
    return (
      <CloudBolt size={compact ? 13 : 44} className={`text-yellow-400!`} />
    );
  return <Cloud size={compact ? 13 : 44} className={`text-white/60!`} />;
}

export function WeatherWidget({ weather, mode, error }: WeatherWidgetProps) {
  const { t } = useTranslation();

  if (!weather) {
    if (error) {
      return (
        <div className="flex items-center gap-1" title={error ?? undefined}>
          <CloudX className="w-3.5 h-3.5 text-orange-400/80!" />
        </div>
      );
    }
    return (
      <div
        className="flex items-center justify-center w-full h-full min-h-[36px]"
        role="status"
      >
        <svg
          className="w-4 h-4 text-white/20 animate-spin fill-white/60"
          viewBox="0 0 100 101"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (mode === "compact") {
    return (
      <div className="flex items-center gap-1">
        {getWeatherIcon(weather.weather_code, weather.is_day, true)}
        <span className="text-[11px] text-white/80 font-medium font-sans">
          {Math.round(weather.temperature)}°
        </span>
      </div>
    );
  }

  // Expanded
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-shrink-0">
        {getWeatherIcon(weather.weather_code, weather.is_day)}
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-white">
            {Math.round(weather.temperature)}°C
          </span>
        </div>
        <span className="text-[9px] text-white/40 leading-tight">
          {t(getWeatherDescriptionKey(weather.weather_code) as any)}
        </span>
        <span className="text-[9px] text-white/30 leading-tight">
          {t("feelsLike", { temp: Math.round(weather.apparent_temperature) })}
        </span>
      </div>
    </div>
  );
}
