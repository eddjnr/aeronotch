use crate::media::{MediaAction, MediaInfo};
use tauri::Emitter;

#[tauri::command]
pub async fn get_media_info() -> Option<MediaInfo> {
    MediaInfo::get_current().await
}

#[tauri::command]
pub async fn media_control(action: MediaAction) -> Result<(), String> {
    action.execute().await
}

#[tauri::command]
pub async fn media_seek(position_seconds: f64, app_handle: tauri::AppHandle) -> Result<(), String> {
    crate::media::media_seek(position_seconds).await?;
    if let Some(media) = MediaInfo::get_current().await {
        let _ = app_handle.emit("media-changed", &media);
    }
    Ok(())
}
