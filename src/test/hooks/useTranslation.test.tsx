import { renderHook } from "@testing-library/react";
import { useTranslation, getWeatherDescriptionKey } from "@/hooks/useTranslation";
import { useSettingsStore } from "@/stores/settings-store";

describe("useTranslation", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      ...useSettingsStore.getInitialState(),
      language: "en",
    });
  });

  it("returns English translation for a known key", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("tabGeneral")).toBe("General");
  });

  it("returns pt-BR translation when language is set", () => {
    useSettingsStore.setState({ language: "pt-BR" });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("tabGeneral")).toBe("Geral");
  });

  it("applies replacements in translation string", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("feelsLike", { temp: 25 })).toBe(
      "Feels like 25°"
    );
  });

  it("falls back to English key when translation is missing", () => {
    useSettingsStore.setState({ language: "pt-BR" });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("trayEmpty")).toBe(
      "Arraste e solte arquivos aqui"
    );
  });

  it("returns the key itself if neither translation exists", () => {
    const { result } = renderHook(() => useTranslation());
    const key = "nonexistent_key_xyz" as any;
    expect(result.current.t(key)).toBe(key);
  });

  it("returns the correct language value", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe("en");
  });
});

describe("getWeatherDescriptionKey", () => {
  it("returns correct key for clear sky (code 0)", () => {
    expect(getWeatherDescriptionKey(0)).toBe("weather_0");
  });

  it("returns correct key for partly cloudy (code 2)", () => {
    expect(getWeatherDescriptionKey(2)).toBe("weather_2");
  });

  it("returns correct key for fog (codes 45-48)", () => {
    expect(getWeatherDescriptionKey(45)).toBe("weather_45");
    expect(getWeatherDescriptionKey(48)).toBe("weather_45");
  });

  it("returns correct key for rain (codes 61, 63, 65)", () => {
    expect(getWeatherDescriptionKey(61)).toBe("weather_61");
    expect(getWeatherDescriptionKey(63)).toBe("weather_61");
    expect(getWeatherDescriptionKey(65)).toBe("weather_61");
  });

  it("returns correct key for thunderstorm (code 95)", () => {
    expect(getWeatherDescriptionKey(95)).toBe("weather_95");
  });

  it("returns correct key for thunderstorm with hail (codes 96, 99)", () => {
    expect(getWeatherDescriptionKey(96)).toBe("weather_96");
    expect(getWeatherDescriptionKey(99)).toBe("weather_96");
  });

  it("returns unknown for unmapped code", () => {
    expect(getWeatherDescriptionKey(999)).toBe("weather_unknown");
  });
});
