use tauri::LogicalSize;
use tauri::Manager;

#[derive(serde::Serialize)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: Option<String>,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

fn calc_position(
    monitor: &tauri::Monitor,
    width: f64,
    position: &str,
) -> (f64, f64) {
    let scale = monitor.scale_factor();
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    let logical_screen_w = monitor_size.width as f64 / scale;
    let monitor_logical_x = monitor_pos.x as f64 / scale;
    let monitor_logical_y = monitor_pos.y as f64 / scale;

    let x = match position {
        "top-left" => monitor_logical_x + 16.0,
        "top-right" => monitor_logical_x + logical_screen_w - width - 16.0,
        _ => monitor_logical_x + (logical_screen_w - width) / 2.0,
    };

    (x, monitor_logical_y)
}

#[tauri::command]
pub async fn set_island_size(
    window: tauri::WebviewWindow,
    registry: tauri::State<'_, std::sync::Arc<crate::island_hit_test::HitRegionRegistry>>,
    width: f64,
    height: f64,
    position: String,
    content_width: f64,
    content_height: f64,
) -> Result<(), String> {
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;

    if let Ok(Some(monitor)) = window.current_monitor() {
        let (x, y) = calc_position(&monitor, width, &position);
        window
            .set_position(tauri::LogicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
    }

    registry.update(&window, width, content_width, content_height);
    Ok(())
}

#[tauri::command]
pub fn set_click_through(window: tauri::WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_available_monitors(app_handle: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
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

#[tauri::command]
pub async fn sync_monitor_windows(
    app_handle: tauri::AppHandle,
    placement: String,
) -> Result<(), String> {
    let monitors = app_handle.available_monitors().map_err(|e| e.to_string())?;
    let main_window = app_handle
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    let position_setting = "top-center";

    if placement == "all" {
        if !monitors.is_empty() {
            if let Ok(Some(monitor)) = main_window.current_monitor() {
                let (x, y) = calc_position(&monitor, 496.0, position_setting);
                let _ = main_window.set_position(tauri::LogicalPosition::new(x, y));
            }
            let _ = main_window.show();
        }

        for i in 1..monitors.len() {
            let label = format!("main_{}", i);
            if let Some(win) = app_handle.get_webview_window(&label) {
                let (x, y) = calc_position(&monitors[i], 496.0, position_setting);
                let _ = win.set_position(tauri::LogicalPosition::new(x, y));
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

                let (x, y) = calc_position(&monitors[i], 496.0, position_setting);
                let _ = new_win.set_position(tauri::LogicalPosition::new(x, y));
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
            let (x, y) = calc_position(&monitor, 496.0, position_setting);
            let _ = main_window.set_position(tauri::LogicalPosition::new(x, y));
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
