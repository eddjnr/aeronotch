import { invoke } from '@tauri-apps/api/core';
import type { MediaInfo, MicStatus, SystemStats, WeatherInfo } from '../types';

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

export async function getMicStatus(): Promise<MicStatus> {
  return invoke<MicStatus>('get_mic_status');
}

export async function setMicMute(mute: boolean): Promise<MicStatus> {
  return invoke<MicStatus>('set_mic_mute', { mute });
}

export async function toggleMicMute(): Promise<MicStatus> {
  return invoke<MicStatus>('toggle_mic_mute');
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
  contentWidth: number,
  contentHeight: number,
): Promise<void> {
  return invoke('set_island_size', { width, height, position, contentWidth, contentHeight });
}

export async function setClickThrough(ignore: boolean): Promise<void> {
  return invoke('set_click_through', { ignore });
}

export async function openSettingsWindow(): Promise<void> {
  return invoke('open_settings_window');
}

export interface GoogleCalendarStatus {
  connected: boolean;
  url?: string;
}

export async function connectGoogleCalendar(
  url: string,
): Promise<void> {
  return invoke('connect_google_calendar', { url });
}

export async function disconnectGoogleCalendar(): Promise<void> {
  return invoke('disconnect_google_calendar');
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return invoke<GoogleCalendarStatus>('get_google_calendar_status');
}

export async function getCalendarEvents(): Promise<any> {
  return invoke('get_calendar_events');
}

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
}

export async function copyFilesToClipboard(paths: string[]): Promise<void> {
  return invoke('copy_files_to_clipboard', { paths });
}

export async function getFileMetadata(path: string): Promise<FileMetadata> {
  return invoke<FileMetadata>('get_file_metadata', { path });
}

export async function revealInExplorer(path: string): Promise<void> {
  return invoke('reveal_in_explorer', { path });
}

export async function renameFileOnDisk(path: string, newName: string): Promise<string> {
  return invoke<string>('rename_file_on_disk', { path, newName });
}

export async function openFileOnDisk(path: string): Promise<void> {
  return invoke('open_file_on_disk', { path });
}

export interface MonitorInfo {
  index: number;
  name: string | null;
  width: number;
  height: number;
  is_primary: boolean;
}

export async function getAvailableMonitors(): Promise<MonitorInfo[]> {
  return invoke<MonitorInfo[]>('get_available_monitors');
}

export async function syncMonitorWindows(placement: string): Promise<void> {
  return invoke('sync_monitor_windows', { placement });
}

