import { useEffect, useRef, useState } from "react";
import { getWeather } from "../lib/tauri-commands";
import { useIslandStore } from "../stores/island-store";
import { getWindowLabel } from "../lib/windowLabel";

export function useWeatherInfo() {
  const [windowLabel] = useState(getWindowLabel);
  const setWeatherInfo = useIslandStore((s) => s.setWeatherInfo);
  const setWeatherError = useIslandStore((s) => s.setWeatherError);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    const fetchWeather = async () => {
      try {
        const info = await getWeather();
        setWeatherInfo(info);
      } catch (err) {
        console.error("[Weather] Failed to fetch weather:", err);
        setWeatherError(String(err));
      }
    };

    fetchWeather();
    // Refresh every 15 minutes
    intervalRef.current = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [windowLabel, setWeatherInfo, setWeatherError]);
}
