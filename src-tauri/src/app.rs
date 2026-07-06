use std::sync::Arc;
use std::time::Instant;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

use crate::commands;
use crate::island_hit_test;
use crate::media::MediaInfo;
use crate::mic::MicStatus;
use crate::system_info::SystemMonitor;
use crate::weather::WeatherClient;
use crate::wmi_metrics;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel::<()>(1);
    let wmi_stats = wmi_metrics::spawn_worker(shutdown_rx.resubscribe());
    let system_monitor = Arc::new(SystemMonitor::new(Some(wmi_stats)));
    let weather_client = Arc::new(WeatherClient::new());
    let hit_region_registry = Arc::new(island_hit_test::HitRegionRegistry::new());
    let shutdown_tx_clone = shutdown_tx.clone();

    let last_focus = Arc::new(std::sync::Mutex::new(Instant::now()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Info
                } else {
                    log::LevelFilter::Warn
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(system_monitor.clone())
        .manage(weather_client.clone())
        .manage(hit_region_registry.clone())
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::media::get_media_info,
            commands::media::media_control,
            commands::media::media_seek,
            commands::mic::get_mic_status,
            commands::mic::set_mic_mute,
            commands::mic::toggle_mic_mute,
            commands::weather::get_weather,
            commands::weather::set_weather_location,
            commands::window::set_island_size,
            commands::window::set_click_through,
            commands::window::sync_monitor_windows,
            commands::window::get_available_monitors,
            commands::settings::open_settings_window,
            commands::calendar::connect_google_calendar,
            commands::calendar::disconnect_google_calendar,
            commands::calendar::get_google_calendar_status,
            commands::calendar::get_calendar_events,
            commands::files::copy_files_to_clipboard,
            commands::files::get_file_metadata,
            commands::files::reveal_in_explorer,
            commands::files::rename_file_on_disk,
            commands::files::open_file_on_disk,
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main")
                .expect("main window must exist at setup");

            use tauri_plugin_positioner::{Position, WindowExt};
            let _ = window.move_window(Position::TopCenter);
            let _ = window.show();

            island_hit_test::spawn_watcher(app.handle().clone(), shutdown_rx.resubscribe());

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
                        log::info!("[app] Iniciando shutdown graciosamente...");
                        let _ = shutdown_tx.send(());
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
                            let _ = commands::settings::open_settings_window(app_handle).await;
                        });
                    }
                    _ => {}
                });

            if let Some(icon) = tray_icon {
                tray_builder = tray_builder.icon(icon);
            }

            let _tray = tray_builder.build(app)?;

            // ── Background: system stats every 3s ──
            let app_handle = app.handle().clone();
            let monitor = system_monitor.clone();
            let mut shutdown_rx_stats = shutdown_rx.resubscribe();
            tauri::async_runtime::spawn(async move {
                log::info!("[system] Iniciando tarefa de monitoramento");
                monitor.detect_gpu_name();

                loop {
                    tokio::select! {
                        _ = shutdown_rx_stats.recv() => {
                            log::info!("[system] Parando tarefa de monitoramento");
                            break;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_secs(3)) => {
                            let stats = monitor.get_stats();
                            let _ = app_handle.emit("system-stats", &stats);
                        }
                    }
                }
            });

            // ── Background: media info on changes ──
            let app_handle_media = app.handle().clone();
            let mut shutdown_rx_media = shutdown_rx.resubscribe();
            tauri::async_runtime::spawn(async move {
                log::info!("[media] Iniciando tarefa de monitoramento de mídia");
                let mut last_title = String::new();
                let mut last_is_playing = false;
                let mut expected_position: Option<f64> = None;
                let mut last_check = std::time::Instant::now();
                const DRIFT_TOLERANCE_SECS: f64 = 2.0;

                loop {
                    tokio::select! {
                        _ = shutdown_rx_media.recv() => {
                            log::info!("[media] Parando tarefa de monitoramento de mídia");
                            break;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_millis(1000)) => {
                            match MediaInfo::get_current().await {
                                Some(media) => {
                                    log::debug!(
                                        "[media] get_current returned: title={:?} artist={:?} playing={}",
                                        media.title, media.artist, media.is_playing
                                    );

                                    let state_changed =
                                        media.title != last_title || media.is_playing != last_is_playing;

                                    let drifted = expected_position
                                        .map(|expected| {
                                            (media.position_seconds - expected).abs() > DRIFT_TOLERANCE_SECS
                                        })
                                        .unwrap_or(false);

                                    if state_changed || drifted {
                                        last_title = media.title.clone();
                                        last_is_playing = media.is_playing;
                                        let _ = app_handle_media.emit("media-changed", &media);
                                    }

                                    let elapsed = last_check.elapsed().as_secs_f64();
                                    expected_position = Some(if media.is_playing {
                                        media.position_seconds + elapsed
                                    } else {
                                        media.position_seconds
                                    });
                                    last_check = std::time::Instant::now();
                                }
                                None => {
                                    log::debug!("[media] get_current returned None");
                                    if !last_title.is_empty() {
                                        last_title.clear();
                                        last_is_playing = false;
                                        expected_position = None;
                                        let _ = app_handle_media
                                            .emit("media-changed", Option::<MediaInfo>::None);
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // ── Background: mic status every 500ms ──
            let app_handle_mic = app.handle().clone();
            let mut shutdown_rx_mic = shutdown_rx.resubscribe();
            tauri::async_runtime::spawn(async move {
                log::info!("[mic] Iniciando tarefa de monitoramento de microfone");
                let mut last_status: Option<MicStatus> = None;
                loop {
                    tokio::select! {
                        _ = shutdown_rx_mic.recv() => {
                            log::info!("[mic] Parando tarefa de monitoramento de microfone");
                            break;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_millis(500)) => {
                            let status = tokio::task::spawn_blocking(|| crate::mic::get_mic_status())
                                .await
                                .unwrap_or_default();

                            if last_status != Some(status) {
                                last_status = Some(status);
                                let _ = app_handle_mic.emit("mic-status-changed", &status);
                            }
                        }
                    }
                }
            });

            // ── Background: Google Calendar every 5 min ──
            crate::google_calendar::start_polling(app.handle().clone(), shutdown_rx.resubscribe());

            Ok(())
        })
        .on_window_event(move |window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    if window.label() == "main" {
                        log::info!("[app] Janela principal fechando, iniciando shutdown");
                        let _ = shutdown_tx_clone.send(());
                    }
                }
                tauri::WindowEvent::Focused(true) => {
                    if window.label() == "main" {
                        let mut last = match last_focus.lock() {
                            Ok(guard) => guard,
                            Err(_) => {
                                log::error!("[app] last_focus mutex poisoned, skipping focus debounce");
                                return;
                            }
                        };
                        if last.elapsed() < std::time::Duration::from_millis(500) {
                            log::info!("[app] Focus event ignorado (debounce)");
                            return;
                        }
                        *last = Instant::now();
                        log::info!("[app] Janela recuperou foco, re-afirmando always-on-top");
                        let _ = window.set_always_on_top(true);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
