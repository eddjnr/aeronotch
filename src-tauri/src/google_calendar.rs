use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use tauri::Emitter;

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

// iCalendar (.ics) line unfolding: joins lines starting with space/tab to the previous line
fn unfold_ics(raw_text: &str) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    for raw_line in raw_text.lines() {
        if raw_line.starts_with(' ') || raw_line.starts_with('\t') {
            if let Some(last) = lines.last_mut() {
                last.push_str(&raw_line[1..]);
            }
        } else {
            lines.push(raw_line.to_string());
        }
    }
    lines
}

// Converts YYYYMMDDTHHMMSS(Z) to YYYY-MM-DDTHH:MM:SS(Z) for JS Date parser compatibility
fn parse_ics_date(raw: &str) -> Option<(String, bool)> {
    let clean = raw.trim();
    if clean.len() < 8 {
        return None;
    }

    let year = &clean[0..4];
    let month = &clean[4..6];
    let day = &clean[6..8];

    if clean.len() == 8 {
        // All-day event: YYYY-MM-DD
        return Some((format!("{}-{}-{}", year, month, day), true));
    }

    if let Some(t_idx) = clean.find('T') {
        if clean.len() >= t_idx + 7 {
            let hour = &clean[t_idx + 1..t_idx + 3];
            let min = &clean[t_idx + 3..t_idx + 5];
            let sec = &clean[t_idx + 5..t_idx + 7];
            let is_utc = clean.ends_with('Z');
            let suffix = if is_utc { "Z" } else { "" };

            return Some((
                format!("{}-{}-{}T{}:{}:{}{}", year, month, day, hour, min, sec, suffix),
                false
            ));
        }
    }
    None
}

// Custom ICS parser to extract calendar events
pub fn parse_ics(text: &str) -> Vec<CalendarEvent> {
    let lines = unfold_ics(text);
    let mut events = Vec::new();

    let mut current_id: Option<String> = None;
    let mut current_summary: Option<String> = None;
    let mut current_start: Option<String> = None;
    let mut current_end: Option<String> = None;
    let mut in_event = false;

    for line in lines {
        let line = line.trim();
        if line.starts_with("BEGIN:VEVENT") {
            in_event = true;
            current_id = None;
            current_summary = None;
            current_start = None;
            current_end = None;
        } else if line.starts_with("END:VEVENT") {
            if in_event {
                let id = current_id.clone().unwrap_or_else(|| format!("event-{}", events.len()));
                let summary = current_summary.clone().unwrap_or_else(|| "No Title".to_string());

                if let Some((start_val, start_is_all_day)) = current_start.as_ref().and_then(|s| parse_ics_date(s)) {
                    if let Some((end_val, _)) = current_end.as_ref().and_then(|e| parse_ics_date(e)) {
                        let start_time = CalendarEventTime {
                            date_time: if !start_is_all_day { Some(start_val.clone()) } else { None },
                            date: if start_is_all_day { Some(start_val) } else { None },
                        };
                        let end_time = CalendarEventTime {
                            date_time: if !start_is_all_day { Some(end_val.clone()) } else { None },
                            date: if start_is_all_day { Some(end_val) } else { None },
                        };

                        events.push(CalendarEvent {
                            id,
                            summary,
                            start: start_time,
                            end: end_time,
                        });
                    }
                }
            }
            in_event = false;
        } else if in_event {
            if let Some(colon_idx) = line.find(':') {
                let key_part = &line[..colon_idx];
                let val_part = &line[colon_idx + 1..];

                // Remove attributes (e.g. "SUMMARY;CHARSET=UTF-8" -> "SUMMARY")
                let key = if let Some(semi_idx) = key_part.find(';') {
                    &key_part[..semi_idx]
                } else {
                    key_part
                };

                match key {
                    "UID" => current_id = Some(val_part.to_string()),
                    "SUMMARY" => {
                        let summary = val_part
                            .replace("\\,", ",")
                            .replace("\\;", ";")
                            .replace("\\n", "\n")
                            .replace("\\\\", "\\");
                        current_summary = Some(summary);
                    }
                    "DTSTART" => current_start = Some(val_part.to_string()),
                    "DTEND" => current_end = Some(val_part.to_string()),
                    _ => {}
                }
            }
        }
    }
    events
}

pub async fn fetch_events(url: &str) -> Result<Vec<CalendarEvent>, String> {
    let client = reqwest::Client::new();
    let res = client.get(url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Server returned error code: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| format!("Failed to read body: {}", e))?;
    let events = parse_ics(&body);
    Ok(events)
}

pub fn start_polling(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            if let Some(config) = load_config(&app) {
                if let Ok(events) = fetch_events(&config.url).await {
                    // Structure payload to match the expected format on the frontend
                    let payload = serde_json::json!({
                        "items": events
                    });
                    let _ = app.emit("google-calendar-events", &payload);
                }
            }
            // Poll calendar events every 15 minutes (900 seconds)
            tokio::time::sleep(std::time::Duration::from_secs(900)).await;
        }
    });
}
