import { useEffect, useRef } from 'react';
import { getWeather } from '../lib/tauri-commands';
import { useIslandStore } from '../stores/island-store';

export function useWeatherInfo() {
  const setWeatherInfo = useIslandStore((s) => s.setWeatherInfo);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const info = await getWeather();
        setWeatherInfo(info);
      } catch {
        // Weather API might fail — don't crash
      }
    };

    fetchWeather();
    // Refresh every 15 minutes
    intervalRef.current = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setWeatherInfo]);
}
