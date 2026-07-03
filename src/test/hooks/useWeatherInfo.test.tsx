import { renderHook } from "@testing-library/react";
import { useWeatherInfo } from "@/hooks/useWeatherInfo";
import { useIslandStore } from "@/stores/island-store";
import type { WeatherInfo } from "@/types";

const mockGetWeather = vi.fn();

vi.mock("@/lib/tauri-commands", () => ({
  getWeather: (...args: any[]) => mockGetWeather(...args),
}));

describe("useWeatherInfo", () => {
  beforeEach(() => {
    useIslandStore.setState(useIslandStore.getInitialState());
    mockGetWeather.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches weather on mount and updates store", async () => {
    const weather: WeatherInfo = {
      temperature: 22,
      apparent_temperature: 20,
      weather_code: 0,
      weather_description: "Clear sky",
      humidity: 50,
      wind_speed: 10,
      is_day: true,
    };
    mockGetWeather.mockResolvedValue(weather);

    renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(useIslandStore.getState().weatherInfo).toEqual(weather);
    });
  });

  it("handles fetch error silently", async () => {
    mockGetWeather.mockRejectedValue(new Error("network error"));

    renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(mockGetWeather).toHaveBeenCalledTimes(1);
    });

    expect(useIslandStore.getState().weatherInfo).toBeNull();
  });

  it("polls every 15 minutes", async () => {
    const weather: WeatherInfo = {
      temperature: 25,
      apparent_temperature: 24,
      weather_code: 1,
      weather_description: "Mainly clear",
      humidity: 40,
      wind_speed: 5,
      is_day: true,
    };
    mockGetWeather.mockResolvedValue(weather);

    renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(mockGetWeather).toHaveBeenCalledTimes(1);
    });

    mockGetWeather.mockClear();

    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(mockGetWeather).toHaveBeenCalledTimes(1);
  });

  it("updates store on each poll response", async () => {
    const weather1: WeatherInfo = {
      temperature: 20,
      apparent_temperature: 18,
      weather_code: 2,
      weather_description: "Partly cloudy",
      humidity: 60,
      wind_speed: 15,
      is_day: true,
    };
    const weather2: WeatherInfo = {
      ...weather1,
      temperature: 18,
      humidity: 70,
    };

    mockGetWeather
      .mockResolvedValueOnce(weather1)
      .mockResolvedValueOnce(weather2);

    renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(useIslandStore.getState().weatherInfo).toEqual(weather1);
    });

    vi.advanceTimersByTime(15 * 60 * 1000);

    await vi.waitFor(() => {
      expect(useIslandStore.getState().weatherInfo).toEqual(weather2);
    });
  });

  it("clears interval on unmount", async () => {
    mockGetWeather.mockResolvedValue({
      temperature: 22,
      apparent_temperature: 20,
      weather_code: 0,
      weather_description: "Clear",
      humidity: 50,
      wind_speed: 10,
      is_day: true,
    });

    const { unmount } = renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(mockGetWeather).toHaveBeenCalledTimes(1);
    });

    mockGetWeather.mockClear();
    unmount();

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(mockGetWeather).not.toHaveBeenCalled();
  });

  it("does not crash if weather fetch fails mid-polling", async () => {
    mockGetWeather
      .mockResolvedValueOnce({
        temperature: 22,
        apparent_temperature: 20,
        weather_code: 0,
        weather_description: "Clear",
        humidity: 50,
        wind_speed: 10,
        is_day: true,
      })
      .mockRejectedValueOnce(new Error("temporary network error"));

    renderHook(() => useWeatherInfo());

    await vi.waitFor(() => {
      expect(mockGetWeather).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(15 * 60 * 1000);
    await vi.waitFor(() => {
      expect(mockGetWeather).toHaveBeenCalledTimes(2);
    });
  });
});
