import { useIslandStore } from "@/stores/island-store";
import type { MediaInfo, SystemStats, WeatherInfo } from "@/types";

describe("island-store", () => {
  beforeEach(() => {
    useIslandStore.setState(useIslandStore.getInitialState());
  });

  it("starts in compact mode", () => {
    expect(useIslandStore.getState().mode).toBe("compact");
  });

  it("setMode updates mode", () => {
    useIslandStore.getState().setMode("expanded");
    expect(useIslandStore.getState().mode).toBe("expanded");
  });

  it("setMediaInfo stores media info", () => {
    const media: MediaInfo = {
      title: "Test Song",
      artist: "Test Artist",
      album: "Test Album",
      is_playing: true,
      position_seconds: 30,
      duration_seconds: 200,
      thumbnail_url: null,
      app_name: "Spotify",
    };
    useIslandStore.getState().setMediaInfo(media);
    expect(useIslandStore.getState().mediaInfo).toEqual(media);
  });

  it("setMediaInfo accepts null", () => {
    useIslandStore.getState().setMediaInfo(null);
    expect(useIslandStore.getState().mediaInfo).toBeNull();
  });

  it("setSystemStats stores system stats", () => {
    const stats: SystemStats = {
      cpu_name: "Intel",
      cpu_usage: 45,
      total_memory: 16000,
      used_memory: 8000,
      memory_percent: 50,
      gpu_name: "NVIDIA",
      gpu_usage: 30,
      disks: [],
    };
    useIslandStore.getState().setSystemStats(stats);
    expect(useIslandStore.getState().systemStats).toEqual(stats);
  });

  it("setWeatherInfo stores weather info", () => {
    const weather: WeatherInfo = {
      temperature: 22,
      apparent_temperature: 20,
      weather_code: 0,
      weather_description: "Clear sky",
      humidity: 50,
      wind_speed: 10,
      is_day: true,
    };
    useIslandStore.getState().setWeatherInfo(weather);
    expect(useIslandStore.getState().weatherInfo).toEqual(weather);
  });

  it("toggleSettings flips settingsOpen", () => {
    expect(useIslandStore.getState().settingsOpen).toBe(false);
    useIslandStore.getState().toggleSettings();
    expect(useIslandStore.getState().settingsOpen).toBe(true);
    useIslandStore.getState().toggleSettings();
    expect(useIslandStore.getState().settingsOpen).toBe(false);
  });

  it("setIsDragging updates dragging state", () => {
    useIslandStore.getState().setIsDragging(true);
    expect(useIslandStore.getState().isDragging).toBe(true);
  });

  it("setActiveTab changes active tab", () => {
    useIslandStore.getState().setActiveTab("system");
    expect(useIslandStore.getState().activeTab).toBe("system");
  });

  it("setIsDropdownOpen updates dropdown state", () => {
    useIslandStore.getState().setIsDropdownOpen(true);
    expect(useIslandStore.getState().isDropdownOpen).toBe(true);
  });
});
