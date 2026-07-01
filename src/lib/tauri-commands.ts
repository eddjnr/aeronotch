import { invoke } from '@tauri-apps/api/core';
import type { MediaInfo, SystemStats, WeatherInfo } from '../types';

export async function getSystemInfo(): Promise<SystemStats> {
  return invoke<SystemStats>('get_system_info');
}

export async function getMediaInfo(): Promise<MediaInfo | null> {
  return invoke<MediaInfo | null>('get_media_info');
}

export async function mediaControl(
  action: 'PlayPause' | 'Next' | 'Previous',
): Promise<void> {
  return invoke('media_control', { action });
}

export async function mediaSeek(positionSeconds: number): Promise<void> {
  return invoke('media_seek', { positionSeconds });
}

export async function getWeather(): Promise<WeatherInfo> {
  return invoke<WeatherInfo>('get_weather');
}

export async function setWeatherLocation(
  latitude: number,
  longitude: number,
): Promise<void> {
  return invoke('set_weather_location', { latitude, longitude });
}

export async function setIslandSize(
  width: number,
  height: number,
  position: string,
): Promise<void> {
  return invoke('set_island_size', { width, height, position });
}

export async function setClickThrough(ignore: boolean): Promise<void> {
  return invoke('set_click_through', { ignore });
}

export async function openSettingsWindow(): Promise<void> {
  return invoke('open_settings_window');
}

