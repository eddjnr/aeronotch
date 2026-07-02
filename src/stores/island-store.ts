import { create } from 'zustand';
import type { IslandMode, MediaInfo, SystemStats, WeatherInfo } from '../types';

interface IslandState {
  mode: IslandMode;
  setMode: (mode: IslandMode) => void;

  mediaInfo: MediaInfo | null;
  setMediaInfo: (info: MediaInfo | null) => void;

  systemStats: SystemStats | null;
  setSystemStats: (stats: SystemStats) => void;

  weatherInfo: WeatherInfo | null;
  setWeatherInfo: (info: WeatherInfo | null) => void;

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

  systemStats: null,
  setSystemStats: (systemStats) => set({ systemStats }),

  weatherInfo: null,
  setWeatherInfo: (weatherInfo) => set({ weatherInfo }),

  settingsOpen: false,
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),

  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),

  isDropdownOpen: false,
  setIsDropdownOpen: (isDropdownOpen) => set({ isDropdownOpen }),
}));
