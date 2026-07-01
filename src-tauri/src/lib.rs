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
        
        let x = match position.as_str() {
            "top-left" => 16.0,
            "top-right" => logical_screen_w - width - 16.0,
            _ => (logical_screen_w - width) / 2.0, // center
        };

        window
            .set_position(tauri::LogicalPosition::new(x, 0.0))
            .map_err(|e| e.to_string())?;
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
        tauri::WebviewUrl::App("index.html".into()),
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
async fn connect_google_calendar(
    app_handle: tauri::AppHandle,
    client_id: Option<String>,
    client_secret: Option<String>,
) -> Result<String, String> {
    google_calendar::connect_flow(app_handle, client_id, client_secret).await
}

#[tauri::command]
async fn disconnect_google_calendar(app_handle: tauri::AppHandle) -> Result<(), String> {
    google_calendar::delete_credentials(&app_handle)
}

#[tauri::command]
async fn get_google_calendar_status(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    if let Some(creds) = google_calendar::load_credentials(&app_handle) {
        Ok(serde_json::json!({
            "connected": true,
            "email": creds.email,
        }))
    } else {
        Ok(serde_json::json!({
            "connected": false,
        }))
    }
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
