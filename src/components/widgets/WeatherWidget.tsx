import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Snowflake,
} from 'lucide-react';
import type { WeatherInfo, IslandMode } from '../../types';

interface WeatherWidgetProps {
  weather: WeatherInfo | null;
  mode: IslandMode;
}

export function getWeatherIcon(code: number, _isDay: boolean, className: string = "w-4 h-4") {
  if (code === 0 || code === 1) return <Sun className={`${className} text-amber-400`} />;
  if (code === 2 || code === 3) return <Cloud className={`${className} text-white/60`} />;
  if (code >= 45 && code <= 48) return <CloudFog className={`${className} text-white/50`} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={`${className} text-blue-300`} />;
  if (code >= 61 && code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-white/70`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-400`} />;
  if (code >= 85 && code <= 86) return <Snowflake className={`${className} text-blue-200`} />;
  if (code >= 95) return <CloudLightning className={`${className} text-yellow-400`} />;
  return <Cloud className={`${className} text-white/60`} />;
}

export function WeatherWidget({ weather, mode }: WeatherWidgetProps) {
  if (!weather) {
    if (mode === 'expanded') {
      return (
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[10px] text-white/30">Loading...</span>
        </div>
      );
    }
    return null;
  }

  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {getWeatherIcon(weather.weather_code, weather.is_day, "w-3.5 h-3.5")}
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
        {getWeatherIcon(weather.weather_code, weather.is_day, "w-5 h-5")}
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-white">
            {Math.round(weather.temperature)}°C
          </span>
        </div>
        <span className="text-[9px] text-white/40 leading-tight">
          {weather.weather_description}
        </span>
        <span className="text-[9px] text-white/30 leading-tight">
          Feels like {Math.round(weather.apparent_temperature)}°
        </span>
      </div>
    </div>
  );
}
