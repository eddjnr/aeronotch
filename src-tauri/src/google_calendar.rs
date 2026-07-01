use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use tauri::Emitter;
use chrono::{Datelike, TimeZone};

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

struct RawEvent {
    id: String,
    summary: String,
    start_raw: String,
    end_raw: String,
    rrule: Option<String>,
}

struct ParsedRRule {
    freq: String,
    until: Option<chrono::DateTime<chrono::Utc>>,
    count: Option<usize>,
    byday: Vec<String>,
    interval: usize,
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

// Converts raw iCal dates to Chrono Utc DateTimes, respecting local user timezone
fn ics_to_datetime(raw: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    let clean = raw.trim();
    if clean.len() < 8 {
        return None;
    }

    let (iso_str, is_all_day) = parse_ics_date(clean)?;

    if is_all_day {
        let naive = chrono::NaiveDateTime::parse_from_str(&format!("{}T00:00:00", iso_str), "%Y-%m-%dT%H:%M:%S").ok()?;
        match chrono::Local.from_local_datetime(&naive) {
            chrono::LocalResult::Single(local_dt) => Some(local_dt.with_timezone(&chrono::Utc)),
            chrono::LocalResult::Ambiguous(dt1, _) => Some(dt1.with_timezone(&chrono::Utc)),
            chrono::LocalResult::None => None,
        }
    } else {
        if iso_str.ends_with('Z') {
            chrono::DateTime::parse_from_rfc3339(&iso_str)
                .ok()
                .map(|dt| dt.with_timezone(&chrono::Utc))
        } else {
            let naive = chrono::NaiveDateTime::parse_from_str(&iso_str, "%Y-%m-%dT%H:%M:%S").ok()?;
            match chrono::Local.from_local_datetime(&naive) {
                chrono::LocalResult::Single(local_dt) => Some(local_dt.with_timezone(&chrono::Utc)),
                chrono::LocalResult::Ambiguous(dt1, _) => Some(dt1.with_timezone(&chrono::Utc)),
                chrono::LocalResult::None => None,
            }
        }
    }
}

// Parses RRULE string parameters
fn parse_rrule(rrule_str: &str) -> Option<ParsedRRule> {
    let mut freq = String::new();
    let mut until = None;
    let mut count = None;
    let mut byday = Vec::new();
    let mut interval = 1;

    for part in rrule_str.split(';') {
        let kv: Vec<&str> = part.split('=').collect();
        if kv.len() == 2 {
            match kv[0] {
                "FREQ" => freq = kv[1].to_string(),
                "UNTIL" => {
                    if let Some((iso_str, _)) = parse_ics_date(kv[1]) {
                        // Append Z if not present to parse cleanly
                        let formatted_iso = if iso_str.ends_with('Z') { iso_str } else { format!("{}Z", iso_str) };
                        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&formatted_iso) {
                            until = Some(dt.with_timezone(&chrono::Utc));
                        }
                    }
                }
                "COUNT" => count = kv[1].parse::<usize>().ok(),
                "BYDAY" => {
                    byday = kv[1].split(',').map(|s| s.to_string()).collect();
                }
                "INTERVAL" => interval = kv[1].parse::<usize>().unwrap_or(1),
                _ => {}
            }
        }
    }

    if freq.is_empty() {
        None
    } else {
        Some(ParsedRRule { freq, until, count, byday, interval })
    }
}

// Expands raw calendar events to list occurrences within the specified range (usually yesterday to +7 days)
fn expand_raw_events(
    raw_events: Vec<RawEvent>,
    range_start: chrono::DateTime<chrono::Utc>,
    range_end: chrono::DateTime<chrono::Utc>,
) -> Vec<CalendarEvent> {
    let mut expanded = Vec::new();

    for raw in raw_events {
        let base_start = match ics_to_datetime(&raw.start_raw) {
            Some(dt) => dt,
            None => continue,
        };
        let base_end = match ics_to_datetime(&raw.end_raw) {
            Some(dt) => dt,
            None => continue,
        };

        let start_is_all_day = raw.start_raw.trim().len() == 8;

        if let Some(rrule_str) = raw.rrule.as_ref() {
            if let Some(rrule) = parse_rrule(rrule_str) {
                let duration = base_end.signed_duration_since(base_start);
                let mut current_start = base_start;
                let mut current_end = base_end;
                let mut occurrence_count = 0;

                for _ in 0..1000 {
                    if let Some(until_dt) = rrule.until {
                        if current_start > until_dt {
                            break;
                        }
                    }

                    if let Some(max_count) = rrule.count {
                        if occurrence_count >= max_count {
                            break;
                        }
                    }

                    let matches_byday = if rrule.byday.is_empty() {
                        if rrule.freq == "WEEKLY" {
                            current_start.weekday() == base_start.weekday()
                        } else {
                            true
                        }
                    } else {
                        let weekday_str = match current_start.weekday() {
                            chrono::Weekday::Mon => "MO",
                            chrono::Weekday::Tue => "TU",
                            chrono::Weekday::Wed => "WE",
                            chrono::Weekday::Thu => "TH",
                            chrono::Weekday::Fri => "FR",
                            chrono::Weekday::Sat => "SA",
                            chrono::Weekday::Sun => "SU",
                        };
                        rrule.byday.contains(&weekday_str.to_string())
                    };

                    if matches_byday {
                        occurrence_count += 1;

                        if current_end >= range_start && current_start <= range_end {
                            let start_val = if start_is_all_day {
                                current_start.format("%Y-%m-%d").to_string()
                            } else {
                                current_start.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                            };
                            let end_val = if start_is_all_day {
                                current_end.format("%Y-%m-%d").to_string()
                            } else {
                                current_end.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                            };

                            expanded.push(CalendarEvent {
                                id: format!("{}-occurrence-{}", raw.id, occurrence_count),
                                summary: raw.summary.clone(),
                                start: CalendarEventTime {
                                    date_time: if !start_is_all_day { Some(start_val.clone()) } else { None },
                                    date: if start_is_all_day { Some(start_val) } else { None },
                                },
                                end: CalendarEventTime {
                                    date_time: if !start_is_all_day { Some(end_val.clone()) } else { None },
                                    date: if start_is_all_day { Some(end_val) } else { None },
                                },
                            });
                        }
                    }

                    if current_start > range_end {
                        break;
                    }

                    match rrule.freq.as_str() {
                        "DAILY" => {
                            current_start = current_start + chrono::Duration::days(rrule.interval as i64);
                            current_end = current_start + duration;
                        }
                        "WEEKLY" => {
                            current_start = current_start + chrono::Duration::days(1);
                            current_end = current_start + duration;
                        }
                        "MONTHLY" => {
                            if let Some(next) = current_start.checked_add_months(chrono::Months::new(rrule.interval as u32)) {
                                current_start = next;
                                current_end = current_start + duration;
                            } else {
                                break;
                            }
                        }
                        "YEARLY" => {
                            if let Some(next) = current_start.checked_add_months(chrono::Months::new((12 * rrule.interval) as u32)) {
                                current_start = next;
                                current_end = current_start + duration;
                            } else {
                                break;
                            }
                        }
                        _ => break,
                    }
                }
            }
        } else {
            if base_end >= range_start && base_start <= range_end {
                let start_val = if start_is_all_day {
                    base_start.format("%Y-%m-%d").to_string()
                } else {
                    base_start.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                };
                let end_val = if start_is_all_day {
                    base_end.format("%Y-%m-%d").to_string()
                } else {
                    base_end.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                };

                expanded.push(CalendarEvent {
                    id: raw.id.clone(),
                    summary: raw.summary.clone(),
                    start: CalendarEventTime {
                        date_time: if !start_is_all_day { Some(start_val.clone()) } else { None },
                        date: if start_is_all_day { Some(start_val) } else { None },
                    },
                    end: CalendarEventTime {
                        date_time: if !start_is_all_day { Some(end_val.clone()) } else { None },
                        date: if start_is_all_day { Some(end_val) } else { None },
                    },
                });
            }
        }
    }

    expanded.sort_by(|a, b| {
        let a_start = a.start.date_time.as_ref().or(a.start.date.as_ref()).unwrap();
        let b_start = b.start.date_time.as_ref().or(b.start.date.as_ref()).unwrap();
        a_start.cmp(b_start)
    });

    expanded
}

pub fn parse_ics(text: &str) -> Vec<CalendarEvent> {
    let lines = unfold_ics(text);
    let mut raw_events = Vec::new();

    let mut current_id: Option<String> = None;
    let mut current_summary: Option<String> = None;
    let mut current_start: Option<String> = None;
    let mut current_end: Option<String> = None;
    let mut current_rrule: Option<String> = None;
    let mut in_event = false;

    for line in lines {
        let line = line.trim();
        if line.starts_with("BEGIN:VEVENT") {
            in_event = true;
            current_id = None;
            current_summary = None;
            current_start = None;
            current_end = None;
            current_rrule = None;
        } else if line.starts_with("END:VEVENT") {
            if in_event {
                let id = current_id.clone().unwrap_or_else(|| format!("event-{}", raw_events.len()));
                let summary = current_summary.clone().unwrap_or_else(|| "No Title".to_string());

                if let Some(start_raw) = current_start.clone() {
                    if let Some(end_raw) = current_end.clone() {
                        raw_events.push(RawEvent {
                            id,
                            summary,
                            start_raw,
                            end_raw,
                            rrule: current_rrule.clone(),
                        });
                    }
                }
            }
            in_event = false;
        } else if in_event {
            if let Some(colon_idx) = line.find(':') {
                let key_part = &line[..colon_idx];
                let val_part = &line[colon_idx + 1..];

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
                    "RRULE" => current_rrule = Some(val_part.to_string()),
                    _ => {}
                }
            }
        }
    }

    // Set expansion window: from 1 day ago to +7 days into the future
    let now = chrono::Utc::now();
    let range_start = now - chrono::Duration::days(1);
    let range_end = now + chrono::Duration::days(7);

    expand_raw_events(raw_events, range_start, range_end)
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
                    let payload = serde_json::json!({
                        "items": events
                    });
                    let _ = app.emit("google-calendar-events", &payload);
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(900)).await;
        }
    });
}
