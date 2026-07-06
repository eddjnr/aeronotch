use tauri::Emitter;

#[tauri::command]
pub async fn connect_google_calendar(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    let events = crate::google_calendar::fetch_events(&url).await?;
    crate::google_calendar::save_config(&app_handle, &crate::google_calendar::CalendarConfig { url })?;

    let payload = serde_json::json!({ "items": events });
    let _ = app_handle.emit("google-calendar-events", &payload);
    Ok(())
}

#[tauri::command]
pub async fn disconnect_google_calendar(app_handle: tauri::AppHandle) -> Result<(), String> {
    crate::google_calendar::delete_config(&app_handle)
}

#[tauri::command]
pub async fn get_google_calendar_status(
    app_handle: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    if let Some(config) = crate::google_calendar::load_config(&app_handle) {
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
pub async fn get_calendar_events(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    if let Some(config) = crate::google_calendar::load_config(&app_handle) {
        let events = crate::google_calendar::fetch_events(&config.url).await?;
        Ok(serde_json::json!({ "items": events }))
    } else {
        Ok(serde_json::json!({ "items": [] }))
    }
}
