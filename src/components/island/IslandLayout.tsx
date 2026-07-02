import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useWillChange } from 'framer-motion';
import { ClockWidget } from '../widgets/ClockWidget';
import { MusicWidget } from '../widgets/MusicWidget';
import { CalendarWidget } from '../widgets/CalendarWidget';
import { SystemWidget } from '../widgets/SystemWidget';
import { WeatherWidget, getWeatherIcon } from '../widgets/WeatherWidget';
import { Equalizer } from './Equalizer';
import { Settings, Home, Cpu, Cloud, Compass, Wind, Droplets } from 'lucide-react';
import { useIslandStore } from '../../stores/island-store';
import { useSettingsStore } from '../../stores/settings-store';
import { openSettingsWindow } from '../../lib/tauri-commands';
import type { IslandMode } from '../../types';

interface IslandLayoutProps {
  mode: IslandMode;
}

export function IslandLayout({ mode }: IslandLayoutProps) {
  const { mediaInfo, systemStats, weatherInfo } = useIslandStore();
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'home' | 'system' | 'weather'>('home');
  const willChange = useWillChange();

  // Determine active tabs based on widget visibility settings
  const hasHomeTab = settings.showMusic || settings.showCalendar;
  const hasSystemTab = settings.showSystem;
  const hasWeatherTab = settings.showWeather;

  // Enforce correct tab focus fallback when widget visibility changes in settings
  useEffect(() => {
    if (activeTab === 'home' && !hasHomeTab) {
      if (hasSystemTab) setActiveTab('system');
      else if (hasWeatherTab) setActiveTab('weather');
    } else if (activeTab === 'system' && !hasSystemTab) {
      if (hasHomeTab) setActiveTab('home');
      else if (hasWeatherTab) setActiveTab('weather');
    } else if (activeTab === 'weather' && !hasWeatherTab) {
      if (hasHomeTab) setActiveTab('home');
      else if (hasSystemTab) setActiveTab('system');
    }
  }, [activeTab, hasHomeTab, hasSystemTab, hasWeatherTab]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* ── Compact Mode ── */}
      {mode === 'compact' && (
        <motion.div
          key="compact"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ willChange }}
          className="absolute inset-0 flex items-center justify-between px-5 whitespace-nowrap"
        >
          <div className="flex items-center gap-3">
            {settings.showMusic && mediaInfo?.is_playing && <Equalizer isPlaying={true} />}
            {settings.showClock && <ClockWidget mode="compact" />}
          </div>
          <div className="flex items-center gap-2">
            {settings.showWeather && <WeatherWidget weather={weatherInfo} mode="compact" />}
            {settings.showSystem && <SystemWidget stats={systemStats} mode="compact" />}
          </div>
        </motion.div>
      )}

      {/* ── Preview Mode ── */}
      {mode === 'preview' && (
        <motion.div
          key="preview"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ willChange }}
          className="absolute inset-0 flex items-center justify-between px-4 whitespace-nowrap"
        >
          <div className="flex items-center gap-3">
            {settings.showMusic && <MusicWidget media={mediaInfo} mode="preview" />}
            {settings.showMusic && mediaInfo?.is_playing && <Equalizer isPlaying={true} />}
          </div>
          <div className="flex items-center gap-3">
            {settings.showClock && <ClockWidget mode="preview" />}
            {settings.showSystem && <SystemWidget stats={systemStats} mode="preview" />}
          </div>
        </motion.div>
      )}

      {/* ── Expanded Mode ── */}
      {mode === 'expanded' && (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
          style={{ willChange }}
          className="absolute inset-0 flex flex-col p-4"
        >
          <div className="flex flex-col h-full">
            {/* Header Bar with Tab Navigation */}
            <div className="flex justify-between items-center w-full mb-3 px-1">
              <div className="flex items-center gap-1 relative">
                {hasHomeTab && (
                  <button
                    onClick={() => setActiveTab('home')}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === 'home' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {activeTab === 'home' && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <Home className="w-3.5 h-3.5" />
                    <span>Início</span>
                  </button>
                )}
                {hasSystemTab && (
                  <button
                    onClick={() => setActiveTab('system')}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === 'system' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {activeTab === 'system' && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Sistema</span>
                  </button>
                )}
                {hasWeatherTab && (
                  <button
                    onClick={() => setActiveTab('weather')}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none focus:outline-none z-10 ${
                      activeTab === 'weather' ? 'text-white font-bold' : 'text-white/45 hover:text-white/60'
                    }`}
                  >
                    {activeTab === 'weather' && (
                      <motion.div
                        layoutId="activeHeaderTabIndicator"
                        className="absolute inset-0 bg-white/[0.08] rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Clima</span>
                  </button>
                )}
              </div>
              <div className="flex items-center text-white/50 pr-1">
                <button
                  onClick={() => openSettingsWindow()}
                  className="hover:text-white transition-colors cursor-pointer focus:outline-none p-1.5 rounded-full hover:bg-white/[0.04]"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab Contents with AnimatePresence Transitions */}
            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                {activeTab === 'home' && hasHomeTab && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                    transition={{ duration: 0.14, ease: 'easeInOut' }}
                    className={`grid gap-4 h-full ${
                      settings.showMusic && settings.showCalendar
                        ? 'grid-cols-[1.2fr_1fr]'
                        : 'grid-cols-1'
                    }`}
                  >
                    {/* Tab 1: Home (Music, Calendar) */}
                    {settings.showMusic && (
                      <div className="flex flex-col min-w-0">
                        <MusicWidget media={mediaInfo} mode="expanded" />
                      </div>
                    )}
                    {settings.showCalendar && (
                      <div className="flex flex-col gap-3 justify-between">
                        <CalendarWidget mode="expanded" />
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'system' && hasSystemTab && (
                  <motion.div
                    key="system"
                    initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                    transition={{ duration: 0.14, ease: 'easeInOut' }}
                    className="flex flex-col flex-1 min-h-0 py-1.5 h-full"
                  >
                    <SystemWidget stats={systemStats} mode="expanded" />
                  </motion.div>
                )}

                {activeTab === 'weather' && hasWeatherTab && (
                  <motion.div
                    key="weather"
                    initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                    transition={{ duration: 0.14, ease: 'easeInOut' }}
                    className="grid grid-cols-[1.1fr_1px_1fr] gap-4 flex-1 min-h-0 py-1.5 px-2 h-full"
                  >
                    {/* Left Column: Temperature and status icon */}
                    <div className="flex items-center gap-4 justify-center">
                      {weatherInfo ? (
                        <>
                          <div className="flex-shrink-0">
                            {getWeatherIcon(weatherInfo.weather_code, weatherInfo.is_day, "w-12 h-12")}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white tracking-tight leading-none">
                              {Math.round(weatherInfo.temperature)}°C
                            </span>
                            <span className="text-[11px] font-medium text-white/60 mt-1">
                              {weatherInfo.weather_description}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-white/30 text-xs">Loading weather data...</div>
                      )}
                    </div>

                    {/* Vertical separator */}
                    <div className="w-[1px] bg-white/[0.06] h-[90%] self-center" />

                    {/* Right Column: Weather stats details */}
                    <div className="flex flex-col justify-between h-full">
                      <span className="text-[10px] font-semibold text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <Compass className="w-3.5 h-3.5 text-white/35" />
                        Condition Details
                      </span>
                      {weatherInfo ? (
                        <div className="flex flex-col gap-2 flex-1 justify-center">
                          <div className="flex justify-between items-center text-[10px] text-white/50 border-b border-white/[0.06] pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Droplets className="w-3.5 h-3.5 text-white/35" />
                              Humidity
                            </span>
                            <span className="text-white/80 font-medium">{weatherInfo.humidity}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-white/50 border-b border-white/[0.06] pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Wind className="w-3.5 h-3.5 text-white/35" />
                              Wind Speed
                            </span>
                            <span className="text-white/80 font-medium">{weatherInfo.wind_speed} km/h</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-white/50 pt-0.5">
                            <span className="text-white/50">Thermal Sensation</span>
                            <span className="text-white/80 font-medium">Feels like {Math.round(weatherInfo.apparent_temperature)}°</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/30 text-xs text-center flex-1 flex items-center justify-center">--</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
