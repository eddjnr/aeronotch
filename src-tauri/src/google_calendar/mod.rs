pub mod parser;
pub mod rrule;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarConfig {
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    pub id: String,
    pub summary: String,
    pub start: CalendarEventTime,
    pub end: CalendarEventTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEventTime {
    #[serde(rename = "dateTime")]
    pub date_time: Option<String>,
    pub date: Option<String>,
}

#[derive(Clone)]
pub struct RawEvent {
    pub id: String,
    pub summary: String,
    pub start_raw: String,
    pub end_raw: String,
    pub rrule: Option<String>,
    pub exdates: Vec<String>,
    pub recurrence_id: Option<String>,
    pub status: Option<String>,
    pub is_declined: bool,
}

pub fn get_config_path(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let _ = std::fs::create_dir_all(&path);
    path.push("calendar_config.json");
    path
}

pub fn load_config(app: &tauri::AppHandle) -> Option<CalendarConfig> {
    let path = get_config_path(app);
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_config(app: &tauri::AppHandle, config: &CalendarConfig) -> Result<(), String> {
    let path = get_config_path(app);
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_config(app: &tauri::AppHandle) -> Result<(), String> {
    let path = get_config_path(app);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub async fn fetch_events(url: &str) -> Result<Vec<CalendarEvent>, String> {
    let client = reqwest::Client::new();

    let buster = chrono::Utc::now().timestamp();
    let buster_url = if url.contains('?') {
        format!("{}&t={}", url, buster)
    } else {
        format!("{}?t={}", url, buster)
    };

    let res = client
        .get(&buster_url)
        .header("Cache-Control", "no-cache, no-store, must-revalidate")
        .header("Pragma", "no-cache")
        .header("Expires", "0")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Server returned error code: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| format!("Failed to read body: {}", e))?;
    let owner_email = parser::extract_email_from_url(url);
    let events = parser::parse_ics(&body, owner_email.as_deref());
    Ok(events)
}

pub fn start_polling(app: tauri::AppHandle, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    tauri::async_runtime::spawn(async move {
        log::info!("[calendar] Iniciando polling de calendário");
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    log::info!("[calendar] Parando polling de calendário");
                    break;
                }
                _ = tokio::time::sleep(std::time::Duration::from_secs(900)) => {
                    if let Some(config) = load_config(&app) {
                        if let Ok(events) = fetch_events(&config.url).await {
                            log::debug!("[calendar] Eventos de calendário atualizados");
                            let payload = serde_json::json!({"items": events});
                            let _ = app.emit("google-calendar-events", &payload);
                        }
                    }
                }
            }
        }
    });
}
