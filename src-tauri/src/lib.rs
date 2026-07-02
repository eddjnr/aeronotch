mod media;
mod system_info;
mod weather;
mod google_calendar;

use media::{MediaAction, MediaInfo};
use system_info::{SystemMonitor, SystemStats};
use weather::{WeatherClient, WeatherInfo};

use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

// ── Tauri Commands ──────────────────────────────────────────────

/// Returns a snapshot of CPU + memory usage.
#[tauri::command]
fn get_system_info(state: tauri::State<'_, Arc<SystemMonitor>>) -> SystemStats {
    state.get_stats()
}

/// Returns the currently playing media track, if any.
#[tauri::command]
async fn get_media_info() -> Option<MediaInfo> {
    MediaInfo::get_current().await
}

/// Forwards a play/pause/next/prev action to the OS media session.
#[tauri::command]
async fn media_control(action: MediaAction) -> Result<(), String> {
    action.execute().await
}

/// Changes the playback position of the current media session (seeking).
#[tauri::command]
async fn media_seek(position_seconds: f64) -> Result<(), String> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    let session = manager.GetCurrentSession().map_err(|e| e.to_string())?;
    
    // Convert seconds to ticks (100-nanosecond intervals)
    let ticks = (position_seconds * 10_000_000.0) as i64;
    
    let success = session.TryChangePlaybackPositionAsync(ticks)
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;
        
    if success {
        Ok(())
    } else {
        Err("Seek action was sent but rejected by the media session".to_string())
    }
}

/// Fetches the current weather (cached for 15 min).
#[tauri::command]
async fn get_weather(state: tauri::State<'_, Arc<WeatherClient>>) -> Result<WeatherInfo, String> {
    state.get_weather().await
}

/// Updates the lat/lon used for weather lookups.
#[tauri::command]
async fn set_weather_location(
    state: tauri::State<'_, Arc<WeatherClient>>,
    latitude: f64,
    longitude: f64,
) -> Result<(), String> {
    state.set_location(latitude, longitude);
    Ok(())
}


/// Resizes the island window and positions it at the top of the screen.
#[tauri::command]
async fn set_island_size(
    window: tauri::WebviewWindow,
    width: f64,
    height: f64,
    position: String,
) -> Result<(), String> {
    use tauri::LogicalSize;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;

    // Position horizontally based on user settings, keeping 0px from top (integrated in bezel)
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen = monitor.size();
        let scale = monitor.scale_factor();
        let logical_screen_w = screen.width as f64 / scale;
        
        let monitor_pos = monitor.position();
        let monitor_logical_x = monitor_pos.x as f64 / scale;
        let monitor_logical_y = monitor_pos.y as f64 / scale;
        
        let x = match position.as_str() {
            "top-left" => monitor_logical_x + 16.0,
            "top-right" => monitor_logical_x + logical_screen_w - width - 16.0,
            _ => monitor_logical_x + (logical_screen_w - width) / 2.0, // center
        };

        window
            .set_position(tauri::LogicalPosition::new(x, monitor_logical_y))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(serde::Serialize)]
struct MonitorInfo {
    index: usize,
    name: Option<String>,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[tauri::command]
async fn get_available_monitors(app_handle: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app_handle.available_monitors().map_err(|e| e.to_string())?;
    let primary = app_handle.primary_monitor().map_err(|e| e.to_string())?;
    
    let mut list = Vec::new();
    for (i, m) in monitors.iter().enumerate() {
        let is_primary = if let Some(ref p) = primary {
            p.name() == m.name() && p.position() == m.position()
        } else {
            i == 0
        };
        
        list.push(MonitorInfo {
            index: i,
            name: m.name().map(|s| s.to_string()),
            width: m.size().width,
            height: m.size().height,
            is_primary,
        });
    }
    
    Ok(list)
}

fn position_window_on_monitor(
    window: &tauri::WebviewWindow,
    monitor: &tauri::Monitor,
    position_setting: &str,
) -> Result<(), String> {
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = monitor.scale_factor();
    let logical_width = size.width as f64 / scale;
    let width = if logical_width > 0.0 { logical_width } else { 496.0 };
    
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    let logical_screen_w = monitor_size.width as f64 / scale;
    
    let monitor_logical_x = monitor_pos.x as f64 / scale;
    let monitor_logical_y = monitor_pos.y as f64 / scale;
    
    let x = match position_setting {
        "top-left" => monitor_logical_x + 16.0,
        "top-right" => monitor_logical_x + logical_screen_w - width - 16.0,
        _ => monitor_logical_x + (logical_screen_w - width) / 2.0, // center
    };
    
    window
        .set_position(tauri::LogicalPosition::new(x, monitor_logical_y))
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
async fn sync_monitor_windows(app_handle: tauri::AppHandle, placement: String) -> Result<(), String> {
    let monitors = app_handle.available_monitors().map_err(|e| e.to_string())?;
    let main_window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    let position_setting = "top-center"; // Default fallback, set_island_size will override it anyway
    
    if placement == "all" {
        if !monitors.is_empty() {
            let _ = position_window_on_monitor(&main_window, &monitors[0], position_setting);
            let _ = main_window.show();
        }
        
        for i in 1..monitors.len() {
            let label = format!("main_{}", i);
            if let Some(win) = app_handle.get_webview_window(&label) {
                let _ = position_window_on_monitor(&win, &monitors[i], position_setting);
                let _ = win.show();
            } else {
                let new_win = tauri::WebviewWindowBuilder::new(
                    &app_handle,
                    &label,
                    tauri::WebviewUrl::App("index.html".into()),
                )
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .shadow(false)
                .visible(false)
                .build()
                .map_err(|e| e.to_string())?;
                
                let _ = position_window_on_monitor(&new_win, &monitors[i], position_setting);
                let _ = new_win.show();
            }
        }
        
        let mut i = monitors.len();
        loop {
            let label = format!("main_{}", i);
            if let Some(win) = app_handle.get_webview_window(&label) {
                let _ = win.close();
                i += 1;
            } else {
                break;
            }
        }
    } else {
        let target_monitor = if placement == "primary" {
            app_handle.primary_monitor().map_err(|e| e.to_string())?
        } else if let Ok(idx) = placement.parse::<usize>() {
            if idx < monitors.len() {
                Some(monitors[idx].clone())
            } else {
                app_handle.primary_monitor().map_err(|e| e.to_string())?
            }
        } else {
            app_handle.primary_monitor().map_err(|e| e.to_string())?
        };
        
        if let Some(monitor) = target_monitor {
            let _ = position_window_on_monitor(&main_window, &monitor, position_setting);
            let _ = main_window.show();
        }
        
        let mut i = 1;
        loop {
            let label = format!("main_{}", i);
            if let Some(win) = app_handle.get_webview_window(&label) {
                let _ = win.close();
                i += 1;
            } else {
                break;
            }
        }
    }
    
    Ok(())
}

/// Toggles whether mouse events pass through the window (click-through).
#[tauri::command]
fn set_click_through(window: tauri::WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

/// Opens a separate Settings / Preferences window.
#[tauri::command]
async fn open_settings_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("settings") {
        let _ = window.set_focus();
        return Ok(());
    }

    let settings_window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "settings",
        tauri::WebviewUrl::App("index.html?window=settings".into()),
    )
    .title("AeroNotch Preferences")
    .inner_size(800.0, 580.0)
    .resizable(false)
    .minimizable(true)
    .maximizable(false)
    .decorations(true)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    let _ = settings_window.center();
    let _ = settings_window.show();
    let _ = settings_window.set_focus();
    Ok(())
}

#[tauri::command]
async fn connect_google_calendar(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    // Validate the URL immediately before saving
    let events = google_calendar::fetch_events(&url).await?;
    google_calendar::save_config(&app_handle, &google_calendar::CalendarConfig { url })?;

    // Emit events immediately so the frontend loads them without waiting 15 minutes
    let payload = serde_json::json!({
        "items": events
    });
    let _ = app_handle.emit("google-calendar-events", &payload);
    Ok(())
}

#[tauri::command]
async fn disconnect_google_calendar(app_handle: tauri::AppHandle) -> Result<(), String> {
    google_calendar::delete_config(&app_handle)
}

#[tauri::command]
async fn get_google_calendar_status(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    if let Some(config) = google_calendar::load_config(&app_handle) {
        Ok(serde_json::json!({
            "connected": true,
            "url": config.url,
        }))
    } else {
        Ok(serde_json::json!({
            "connected": false,
        }))
    }
}

#[tauri::command]
async fn get_calendar_events(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    if let Some(config) = google_calendar::load_config(&app_handle) {
        let events = google_calendar::fetch_events(&config.url).await?;
        Ok(serde_json::json!({
            "items": events
        }))
    } else {
        Ok(serde_json::json!({
            "items": []
        }))
    }
}

/// Copies a list of absolute file paths to the Windows clipboard in CF_HDROP format.
#[tauri::command]
fn copy_files_to_clipboard(paths: Vec<String>) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::DataExchange::{OpenClipboard, EmptyClipboard, SetClipboardData, CloseClipboard};
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GHND};
    use windows::Win32::UI::Shell::DROPFILES;

    // 1. Prepare double-null-terminated wide (UTF-16) string for paths
    let mut buffer: Vec<u16> = Vec::new();
    for path in paths {
        let os_str = OsStr::new(&path);
        buffer.extend(os_str.encode_wide());
        buffer.push(0); // null terminator for each path
    }
    buffer.push(0); // final double-null terminator

    // Size of DROPFILES struct + size of buffer in bytes
    let dropfiles_size = std::mem::size_of::<DROPFILES>();
    let total_size = dropfiles_size + (buffer.len() * 2);

    unsafe {
        // 2. Allocate global memory
        // GHND is GMEM_MOVEABLE | GMEM_ZEROINIT
        let h_global = GlobalAlloc(GHND, total_size).map_err(|e| e.to_string())?;
        let p_global = GlobalLock(h_global);
        if p_global.is_null() {
            return Err("Failed to lock global memory".to_string());
        }

        // 3. Write DROPFILES struct
        let dropfiles = p_global as *mut DROPFILES;
        (*dropfiles).pFiles = dropfiles_size as u32;
        (*dropfiles).fWide = windows::Win32::Foundation::BOOL::from(true); // UTF-16

        // 4. Copy paths buffer right after the DROPFILES struct
        let p_paths = (p_global as *mut u8).add(dropfiles_size) as *mut u16;
        std::ptr::copy_nonoverlapping(buffer.as_ptr(), p_paths, buffer.len());

        let _ = GlobalUnlock(h_global);

        // 5. Open and write to clipboard
        OpenClipboard(HWND::default()).map_err(|e| e.to_string())?;
        EmptyClipboard().map_err(|e| e.to_string())?;
        
        // CF_HDROP is format 15
        SetClipboardData(15, windows::Win32::Foundation::HANDLE(h_global.0)).map_err(|e| e.to_string())?;

        CloseClipboard().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(serde::Serialize)]
struct FileMetadata {
    name: String,
    path: String,
    size: u64,
    is_dir: bool,
}

/// Retrieves metadata for a file at the given absolute path.
#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    use std::fs;
    use std::path::Path;

    let path_buf = Path::new(&path);
    if !path_buf.exists() {
        return Err("File does not exist".to_string());
    }

    let name = path_buf
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());

    let metadata = fs::metadata(path_buf).map_err(|e| e.to_string())?;
    let size = metadata.len();
    let is_dir = metadata.is_dir();

    Ok(FileMetadata {
        name,
        path,
        size,
        is_dir,
    })
}

/// Opens Windows Explorer and highlights/selects the file at the given path.
#[tauri::command]
fn reveal_in_explorer(path: String) -> Result<(), String> {
    use std::process::Command;
    Command::new("explorer")
        .args(&["/select,", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Renames a physical file on disk and returns its new absolute path.
#[tauri::command]
fn rename_file_on_disk(path: String, new_name: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let old_path = Path::new(&path);
    if !old_path.exists() {
        return Err("File does not exist".to_string());
    }

    let parent = old_path.parent().ok_or("Cannot resolve parent folder")?;
    let new_path = parent.join(new_name);

    fs::rename(old_path, &new_path).map_err(|e| e.to_string())?;

    Ok(new_path.to_string_lossy().to_string())
}

/// Opens a file or path with the default system application.
#[tauri::command]
fn open_file_on_disk(path: String) -> Result<(), String> {
    use std::process::Command;
    Command::new("cmd")
        .args(&["/c", "start", "", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── App Setup ───────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let system_monitor = Arc::new(SystemMonitor::new());
    let weather_client = Arc::new(WeatherClient::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(system_monitor.clone())
        .manage(weather_client.clone())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_media_info,
            media_control,
            media_seek,
            get_weather,
            set_weather_location,
            set_island_size,
            set_click_through,
            open_settings_window,
            connect_google_calendar,
            disconnect_google_calendar,
            get_google_calendar_status,
            get_calendar_events,
            copy_files_to_clipboard,
            get_file_metadata,
            reveal_in_explorer,
            rename_file_on_disk,
            open_file_on_disk,
            get_available_monitors,
            sync_monitor_windows,
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            // Position at top-center of screen
            use tauri_plugin_positioner::{Position, WindowExt};
            let _ = window.move_window(Position::TopCenter);

            // Show window after positioning
            let _ = window.show();



            // ── Tray Icon ──
            let quit = MenuItem::with_id(app, "quit", "Quit AeroNotch", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &settings, &quit])?;

            let tray_icon = app.default_window_icon().cloned();

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("AeroNotch")
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "settings" => {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_settings_window(app_handle).await;
                        });
                    }
                    _ => {}
                });

            if let Some(icon) = tray_icon {
                tray_builder = tray_builder.icon(icon);
            }

            let _tray = tray_builder.build(app)?;

            // ── Background: emit system stats every 3 seconds ──
            let app_handle = app.handle().clone();
            let monitor = system_monitor.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let stats = monitor.get_stats();
                    let _ = app_handle.emit("system-stats", &stats);
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                }
            });

            // ── Background: emit media info every 1 second ──
            let app_handle_media = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last_title = String::new();
                let mut last_is_playing = false;
                loop {
                    if let Some(media) = MediaInfo::get_current().await {
                        if media.title != last_title || media.is_playing != last_is_playing || media.is_playing {
                            last_title = media.title.clone();
                            last_is_playing = media.is_playing;
                            let _ = app_handle_media.emit("media-changed", &media);
                        }
                    } else {
                        if !last_title.is_empty() {
                            last_title.clear();
                            last_is_playing = false;
                            let _ = app_handle_media.emit("media-changed", Option::<MediaInfo>::None);
                        }
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                }
            });

            // ── Background: emit Google Calendar events every 5 minutes ──
            google_calendar::start_polling(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
