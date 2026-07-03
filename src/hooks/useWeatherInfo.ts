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
      } catch (err) {
        console.error('[Weather] Failed to fetch weather:', err);
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
