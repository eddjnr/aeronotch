import { useSettingsStore } from "@/stores/settings-store";
import type { IslandSettings } from "@/types";

describe("settings-store", () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState());
  });

  const defaults: IslandSettings = {
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

  it("has default settings", () => {
    const state = useSettingsStore.getState();
    expect(state.position).toBe(defaults.position);
    expect(state.opacity).toBe(defaults.opacity);
    expect(state.language).toBe(defaults.language);
  });

  it("updateSetting updates a single setting", () => {
    useSettingsStore.getState().updateSetting("opacity", 0.5);
    expect(useSettingsStore.getState().opacity).toBe(0.5);
  });

  it("updateSetting does not affect other settings", () => {
    useSettingsStore.getState().updateSetting("language", "pt-BR");
    expect(useSettingsStore.getState().language).toBe("pt-BR");
    expect(useSettingsStore.getState().position).toBe("top-center");
  });

  it("resetSettings restores defaults", () => {
    useSettingsStore.getState().updateSetting("opacity", 0.3);
    useSettingsStore.getState().updateSetting("language", "pt-BR");
    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();
    expect(state.opacity).toBe(1);
    expect(state.language).toBe("en");
    expect(state.position).toBe("top-center");
  });

  it("showMusic toggle works", () => {
    useSettingsStore.getState().updateSetting("showMusic", false);
    expect(useSettingsStore.getState().showMusic).toBe(false);
  });
});
