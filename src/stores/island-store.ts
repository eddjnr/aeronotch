import { create } from 'zustand';
import type { IslandMode, MediaInfo, MicStatus, SystemStats, WeatherInfo } from '../types';

interface IslandState {
  mode: IslandMode;
  setMode: (mode: IslandMode) => void;

  mediaInfo: MediaInfo | null;
  setMediaInfo: (info: MediaInfo | null) => void;

  micStatus: MicStatus | null;
  setMicStatus: (status: MicStatus | null) => void;

  systemStats: SystemStats | null;
  setSystemStats: (stats: SystemStats) => void;

  weatherInfo: WeatherInfo | null;
  setWeatherInfo: (info: WeatherInfo | null) => void;
  weatherError: string | null;
  setWeatherError: (error: string | null) => void;

  settingsOpen: boolean;
  toggleSettings: () => void;

  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;

  activeTab: "home" | "system" | "weather" | "tray";
  setActiveTab: (tab: "home" | "system" | "weather" | "tray") => void;

  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
}

export const useIslandStore = create<IslandState>((set) => ({
  mode: 'compact',
  setMode: (mode) => set({ mode }),

  mediaInfo: null,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),

  micStatus: null,
  setMicStatus: (micStatus) => set({ micStatus }),

  systemStats: null,
  setSystemStats: (systemStats) => set({ systemStats }),

  weatherInfo: null,
  setWeatherInfo: (weatherInfo) => set({ weatherInfo, weatherError: null }),
  weatherError: null,
  setWeatherError: (weatherError) => set({ weatherError }),

  settingsOpen: false,
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),

  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),

  isDropdownOpen: false,
  setIsDropdownOpen: (isDropdownOpen) => set({ isDropdownOpen }),
}));
