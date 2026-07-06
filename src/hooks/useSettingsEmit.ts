import { useCallback } from "react";
import { emit } from "@tauri-apps/api/event";
import { useSettingsStore } from "../stores/settings-store";
import type { IslandSettings } from "../types";

export function useSettingsEmit() {
  const settings = useSettingsStore();

  const updateAndEmit = useCallback(
    <K extends keyof IslandSettings>(key: K, value: IslandSettings[K]) => {
      settings.updateSetting(key, value);
      emit("settings-changed", { key, value }).catch(console.error);
    },
    [settings],
  );

  return { settings, updateAndEmit };
}
