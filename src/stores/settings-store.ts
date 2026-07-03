import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IslandSettings } from "../types";

interface SettingsState extends IslandSettings {
  updateSetting: <K extends keyof IslandSettings>(
    key: K,
    value: IslandSettings[K],
  ) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: IslandSettings = {
  position: "top-center",
  showMusic: true,
  showCalendar: true,
  showSystem: true,
  showWeather: true,
  showClock: true,
  showTray: true,
  showMic: true,
  opacity: 1,
  language: "en",
  monitorPlacement: "primary",
  rightCornerMode: "widgets",
  customRightCornerUrl: "",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      updateSetting: (key, value) => set({ [key]: value }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    { name: "aeronotch-settings" },
  ),
);
