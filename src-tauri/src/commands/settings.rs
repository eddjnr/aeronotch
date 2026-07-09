use tauri::Manager;

#[tauri::command]
pub async fn open_settings_window(app_handle: tauri::AppHandle) -> Result<(), String> {
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
    Ok(())
}
