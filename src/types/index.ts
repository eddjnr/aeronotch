export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  is_playing: boolean;
  position_seconds: number;
  duration_seconds: number;
  thumbnail_url: string | null;
  app_name: string | null;
}

export interface SystemStats {
  cpu_usage: number;
  total_memory: number;
  used_memory: number;
  memory_percent: number;
}

export interface WeatherInfo {
  temperature: number;
  apparent_temperature: number;
  weather_code: number;
  weather_description: string;
  humidity: number;
  wind_speed: number;
  is_day: boolean;
}

export type IslandMode = 'compact' | 'preview' | 'expanded';

export interface IslandSettings {
  position: 'top-center' | 'top-left' | 'top-right';
  showMusic: boolean;
  showCalendar: boolean;
  showSystem: boolean;
  showWeather: boolean;
  showClock: boolean;
  opacity: number;
}
