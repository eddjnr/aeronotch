import { useState, useEffect } from "react";
import { getAvailableMonitors, MonitorInfo } from "../lib/tauri-commands";

export function useMonitors() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);

  useEffect(() => {
    getAvailableMonitors()
      .then(setMonitors)
      .catch((e) => console.error("Failed to load monitors", e));
  }, []);

  return { monitors };
}
