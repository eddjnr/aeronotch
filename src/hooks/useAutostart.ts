import { useState, useEffect } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export function useAutostart() {
  const [autostart, setAutostart] = useState(false);

  const toggleAutostart = async () => {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch (e) {
      console.error("Failed to toggle autostart", e);
    }
  };

  useEffect(() => {
    async function checkAutostart() {
      try {
        setAutostart(await isEnabled());
      } catch (e) {
        console.warn("Autostart plugin not fully loaded in browser", e);
      }
    }
    checkAutostart();
  }, []);

  return { autostart, toggleAutostart };
}
