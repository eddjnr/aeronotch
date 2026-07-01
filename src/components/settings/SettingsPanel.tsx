import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import {
  Music,
  Calendar,
  Activity,
  Cloud,
  Clock,
  Grid,
  ListTodo,
  Info,
  Settings,
  LayoutGrid,
  HeartHandshake,
  RotateCcw,
} from "lucide-react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { emit } from "@tauri-apps/api/event";
import { SpinningText } from "@/components/ui/spinnig-text";
import { motion, AnimatePresence } from "framer-motion";

// Custom macOS/iOS Style Toggle Switch
function IOSSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer relative ${
        checked ? "bg-[#007aff]" : "bg-[#d1d1d6]"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<"general" | "widgets" | "about">(
    "general",
  );
  const [autostart, setAutostart] = useState(false);

  // Load Autostart status on mount
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

  const handleToggleAutostart = async () => {
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

  const handleToggleWidget = (
    key:
      | "showMusic"
      | "showCalendar"
      | "showSystem"
      | "showWeather"
      | "showClock",
  ) => {
    const nextValue = !settings[key];
    settings.updateSetting(key, nextValue);
    emit("settings-changed", { key, value: nextValue }).catch(console.error);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = parseFloat(e.target.value);
    settings.updateSetting("opacity", nextValue);
    emit("settings-changed", { key: "opacity", value: nextValue }).catch(
      console.error,
    );
  };

  const handlePositionChange = (
    pos: "top-left" | "top-center" | "top-right",
  ) => {
    settings.updateSetting("position", pos);
    emit("settings-changed", { key: "position", value: pos }).catch(
      console.error,
    );
  };

  const handleResetSettings = () => {
    settings.resetSettings();
    // Emit all defaults to synchronize island in real-time
    const defaults = {
      position: "top-center",
      showMusic: true,
      showCalendar: true,
      showSystem: true,
      showWeather: true,
      showClock: true,
      opacity: 0.92,
    };
    Object.entries(defaults).forEach(([key, value]) => {
      emit("settings-changed", { key, value }).catch(console.error);
    });
  };

  return (
    <div className="flex h-full w-full bg-[#f5f5f7] text-[#1d1d1f] font-sans overflow-hidden">
      {/* LEFT SIDEBAR (Primary Navigation) */}
      <div className="w-56 bg-[#e8e8ea] border-r border-[#d9d9d9] flex flex-col justify-between flex-shrink-0 select-none">
        <div className="flex flex-col pt-6 px-3">
          {/* Brand Identity Header */}
          <div className="flex items-center gap-2.5 px-3 mb-6">
            <img
              src="/logo.png"
              alt="AeroNotch Logo"
              className="w-8 h-8 rounded-lg shadow-sm object-cover select-none pointer-events-none"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#1d1d1f] tracking-tight leading-none">
                AeroNotch
              </span>
              <span className="text-[9px] text-[#86868b] mt-0.5">
                Preferences
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-0.5">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "general"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Settings
                className={`w-4 h-4 ${
                  activeTab === "general" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab("widgets")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "widgets"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <LayoutGrid
                className={`w-4 h-4 ${
                  activeTab === "widgets" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>Widgets</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all outline-none text-left ${
                activeTab === "about"
                  ? "bg-[#007aff] text-white"
                  : "text-[#1d1d1f] hover:bg-black/5"
              }`}
            >
              <Info
                className={`w-4 h-4 ${
                  activeTab === "about" ? "text-white" : "text-[#555557]"
                }`}
              />
              <span>About</span>
            </button>
          </nav>
        </div>

        {/* Footer Credit */}
        <div className="p-4 border-t border-[#d9d9d9]/60 flex items-center justify-between text-[9px] text-[#86868b] font-medium leading-none">
          <span>AeroNotch v0.1.0</span>
          <HeartHandshake className="w-3 h-3 text-[#ff2d55]" />
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-10 py-8 select-none">
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-6 max-w-lg"
            >
              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
                  General
                </h1>
                <p className="text-[10px] text-[#86868b] mt-0.5">
                  Configure window positioning, transparency, and launch
                  properties.
                </p>
              </div>

              {/* iOS-Style Settings Group (Appearance) */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-1.5">
                  Appearance & Placement
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Screen Position */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        Screen Position
                      </span>
                      <span className="text-[10px] text-[#86868b] mt-0.5">
                        Choose which part of the bezel the notch attaches to.
                      </span>
                    </div>
                    <div className="flex bg-[#e8e8ea] rounded-lg p-0.5 border border-black/5">
                      {(["top-left", "top-center", "top-right"] as const).map(
                        (pos) => (
                          <button
                            key={pos}
                            onClick={() => handlePositionChange(pos)}
                            className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer outline-none ${
                              settings.position === pos
                                ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] text-[#1d1d1f]"
                                : "text-[#555557] hover:text-[#1d1d1f]"
                            }`}
                          >
                            {pos === "top-left"
                              ? "Left"
                              : pos === "top-center"
                                ? "Center"
                                : "Right"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Island Opacity */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        Island Opacity
                      </span>
                      <span className="text-[10px] text-[#86868b] mt-0.5">
                        Set the translucency level of the island backdrop.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-40">
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={settings.opacity}
                        onChange={handleOpacityChange}
                        className="flex-1 h-1 bg-[#e8e8ea] rounded-lg appearance-none cursor-pointer accent-[#007aff] outline-none"
                      />
                      <span className="font-mono font-semibold text-[10px] text-[#1d1d1f] w-8 text-right">
                        {Math.round(settings.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* iOS-Style Settings Group (System) */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-1.5">
                  System Preferences
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Launch on Startup */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        Launch on Startup
                      </span>
                      <span className="text-[10px] text-[#86868b] mt-0.5">
                        Start AeroNotch automatically when logging into Windows.
                      </span>
                    </div>
                    <IOSSwitch
                      checked={autostart}
                      onChange={handleToggleAutostart}
                    />
                  </div>

                  {/* Reset Defaults */}
                  <div className="flex items-center justify-between p-4 bg-white hover:bg-red-50/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#1d1d1f]">
                        Reset to Defaults
                      </span>
                      <span className="text-[10px] text-[#86868b] mt-0.5">
                        Restore all settings to their original factory values.
                      </span>
                    </div>
                    <button
                      onClick={handleResetSettings}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-[10px] font-semibold transition-all cursor-pointer outline-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "widgets" && (
            <motion.div
              key="widgets"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-6 max-w-lg"
            >
              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
                  Widgets
                </h1>
                <p className="text-[10px] text-[#86868b] mt-0.5">
                  Enable or disable individual information layers on the island.
                </p>
              </div>

              {/* iOS-Style Settings Group (Widgets List) */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-1.5">
                  Active Modules
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Media Player */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#ff2d55] text-white shadow-[0_1px_3px_rgba(255,45,85,0.3)] flex-shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          Media Player
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Shows track name, artist, sound EQ and timeline
                          progress.
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showMusic}
                      onChange={() => handleToggleWidget("showMusic")}
                    />
                  </div>

                  {/* Calendar Grid */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#ff9500] text-white shadow-[0_1px_3px_rgba(255,149,0,0.3)] flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          Calendar Grid
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Displays the current week schedule and calendar
                          agenda.
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showCalendar}
                      onChange={() => handleToggleWidget("showCalendar")}
                    />
                  </div>

                  {/* System Monitors */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#34c759] text-white shadow-[0_1px_3px_rgba(52,199,89,0.3)] flex-shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          System Monitors
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Monitors realtime CPU/RAM load, battery and connection
                          status.
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showSystem}
                      onChange={() => handleToggleWidget("showSystem")}
                    />
                  </div>

                  {/* Weather Details */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#5ac8fa] text-white shadow-[0_1px_3px_rgba(90,200,250,0.3)] flex-shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          Weather Details
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Tracks location temperature, warnings and forecast
                          conditions.
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showWeather}
                      onChange={() => handleToggleWidget("showWeather")}
                    />
                  </div>

                  {/* Digital Clock */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#5856d6] text-white shadow-[0_1px_3px_rgba(88,86,214,0.3)] flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          Digital Clock
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Sleek top bar system clock visible in compact states.
                        </span>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={settings.showClock}
                      onChange={() => handleToggleWidget("showClock")}
                    />
                  </div>
                </div>
              </div>

              {/* iOS-Style Settings Group (Upcoming Lists) */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-1.5">
                  Upcoming Extensions
                </span>
                <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden opacity-45 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {/* Quick Apps */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
                        <Grid className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          Quick Apps
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Dock application launching controls in the island
                          panel.
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-[#86868b] bg-[#e8e8ea] px-2 py-0.5 rounded uppercase tracking-wider select-none">
                      Planned
                    </span>
                  </div>

                  {/* To-dos */}
                  <div className="flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#8e8e93] text-white flex-shrink-0">
                        <ListTodo className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1d1d1f]">
                          To-dos & Tasks
                        </span>
                        <span className="text-[9px] text-[#86868b] mt-0.5">
                          Keep track of active checklists directly from the
                          bezel.
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-[#86868b] bg-[#e8e8ea] px-2 py-0.5 rounded uppercase tracking-wider select-none">
                      Planned
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center justify-center text-center gap-4 py-8 select-none"
            >
              {/* Logo container with spinning text */}
              <div className="relative w-44 h-44 flex items-center justify-center mb-1">
                <img
                  src="/logo.png"
                  alt="AeroNotch Logo"
                  className="w-16 h-16 rounded-2xl object-cover z-10 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/20 select-none pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <SpinningText
                    radius={5.5}
                    fontSize={0.8}
                    variants={{
                      container: {
                        hidden: {
                          opacity: 1,
                        },
                        visible: {
                          opacity: 1,
                          rotate: 360,
                          transition: {
                            type: "spring",
                            bounce: 0,
                            duration: 8,
                            repeat: Infinity,
                            staggerChildren: 0.03,
                          },
                        },
                      },
                      item: {
                        hidden: {
                          opacity: 0,
                          filter: "blur(4px)",
                        },
                        visible: {
                          opacity: 1,
                          filter: "blur(0px)",
                        },
                      },
                    }}
                    className="font-bold text-[#86868b] uppercase tracking-[0.05em]"
                  >{`aeronotch • powered by • ed • `}</SpinningText>
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
                  AeroNotch
                </h1>
                <span className="text-[10px] text-[#86868b] font-semibold leading-none mt-1 inline-block">
                  Version 0.1.0 (Stable)
                </span>
              </div>

              <p className="text-xs text-[#515154] max-w-sm leading-relaxed mt-1">
                AeroNotch is an Apple-inspired Dynamic Island utility built with
                Tauri, Rust, and React, bringing elegant information delivery
                and system controls to the Windows Desktop bezel.
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-[#86868b] mt-4">
                <HeartHandshake className="w-4 h-4 text-[#ff2d55]" />
                <span>Built by pair-programming with Antigravity</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
