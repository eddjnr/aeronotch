use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use tauri::Emitter;
use chrono::{Datelike, TimeZone, Timelike};

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
struct RawEvent {
    id: String,
    summary: String,
    start_raw: String,
    end_raw: String,
    rrule: Option<String>,
    exdates: Vec<String>,
    recurrence_id: Option<String>,
    status: Option<String>,
    is_declined: bool,
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

    // Map to quickly look up recurrence overrides by master event UID/ID.
    // Key: UID/ID, Value: list of (recurrence_id_dt, RawEvent override)
    let mut overrides_map: std::collections::HashMap<String, Vec<(chrono::DateTime<chrono::Utc>, RawEvent)>> = std::collections::HashMap::new();

    let mut masters = Vec::new();
    let mut overrides = Vec::new();

    for raw in raw_events {
        if let Some(ref rec_id_raw) = raw.recurrence_id {
            if let Some(rec_dt) = ics_to_datetime(rec_id_raw) {
                overrides_map.entry(raw.id.clone()).or_insert_with(Vec::new).push((rec_dt, raw.clone()));
                overrides.push(raw);
            } else {
                masters.push(raw);
            }
        } else {
            masters.push(raw);
        }
    }

    for raw in masters {
        // Skip master events that are cancelled or declined at the series level
        let status = raw.status.clone().unwrap_or_else(|| "CONFIRMED".to_string());
        if status.trim().to_uppercase() == "CANCELLED" || raw.is_declined {
            continue;
        }

        let base_start = match ics_to_datetime(&raw.start_raw) {
            Some(dt) => dt,
            None => continue,
        };
        let base_end = match ics_to_datetime(&raw.end_raw) {
            Some(dt) => dt,
            None => continue,
        };

        let start_is_all_day = raw.start_raw.trim().len() == 8;

        // Parse exception dates (EXDATE)
        let mut parsed_exdates = Vec::new();
        for ex in &raw.exdates {
            if let Some(ex_dt) = ics_to_datetime(ex) {
                let ex_is_all_day = ex.trim().len() == 8;
                parsed_exdates.push((ex_dt, ex_is_all_day));
            }
        }

        if let Some(rrule_str) = raw.rrule.as_ref() {
            if let Some(rrule) = parse_rrule(rrule_str) {
                let duration = base_end.signed_duration_since(base_start);
                let mut current_start = base_start;
                let mut current_end = base_end;
                let mut occurrence_count = 0;

                // Fast-forward current_start if no COUNT limit is set to avoid loop budget exhaustion
                if rrule.count.is_none() {
                    let diff_days = range_start.signed_duration_since(base_start).num_days();
                    if diff_days > 7 {
                        match rrule.freq.as_str() {
                            "DAILY" => {
                                let step = rrule.interval as i64;
                                if step > 0 {
                                    let steps = diff_days / step;
                                    current_start = base_start + chrono::Duration::days(steps * step);
                                    current_end = current_start + duration;
                                }
                            }
                            "WEEKLY" => {
                                let step = (rrule.interval * 7) as i64;
                                if step > 0 {
                                    let steps = diff_days / step;
                                    current_start = base_start + chrono::Duration::days(steps * step);
                                    current_end = current_start + duration;
                                }
                            }
                            "MONTHLY" => {
                                let diff_months = (range_start.year() - base_start.year()) * 12
                                    + (range_start.month() as i32 - base_start.month() as i32);
                                if diff_months > 1 {
                                    let step = rrule.interval as i32;
                                    if step > 0 {
                                        let steps = diff_months / step;
                                        if let Some(next) = base_start.checked_add_months(chrono::Months::new((steps * step) as u32)) {
                                            current_start = next;
                                            current_end = current_start + duration;
                                        }
                                    }
                                }
                            }
                            "YEARLY" => {
                                let diff_years = range_start.year() - base_start.year();
                                if diff_years > 1 {
                                    let step = rrule.interval as i32;
                                    if step > 0 {
                                        let steps = diff_years / step;
                                        if let Some(next) = base_start.checked_add_months(chrono::Months::new((steps * step * 12) as u32)) {
                                            current_start = next;
                                            current_end = current_start + duration;
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }

                for _ in 0..1000 {
                    if current_start > range_end {
                        break;
                    }

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

                    if rrule.freq == "WEEKLY" && !rrule.byday.is_empty() {
                        // For WEEKLY with BYDAY, we look at all days in the current week
                        let offset = current_start.weekday().num_days_from_monday();
                        let monday = current_start - chrono::Duration::days(offset as i64);

                        for d in 0..7 {
                            let day = monday + chrono::Duration::days(d);
                            if day < base_start {
                                continue;
                            }
                            if let Some(until_dt) = rrule.until {
                                if day > until_dt {
                                    break;
                                }
                            }

                            let weekday_str = match day.weekday() {
                                chrono::Weekday::Mon => "MO",
                                chrono::Weekday::Tue => "TU",
                                chrono::Weekday::Wed => "WE",
                                chrono::Weekday::Thu => "TH",
                                chrono::Weekday::Fri => "FR",
                                chrono::Weekday::Sat => "SA",
                                chrono::Weekday::Sun => "SU",
                            };

                            if rrule.byday.contains(&weekday_str.to_string()) {
                                // Check if this specific day is excluded via EXDATE
                                let is_excluded = parsed_exdates.iter().any(|(ex_dt, ex_is_all_day)| {
                                    if *ex_is_all_day || start_is_all_day {
                                        ex_dt.year() == day.year() && ex_dt.month() == day.month() && ex_dt.day() == day.day()
                                    } else {
                                        ex_dt.timestamp() == day.timestamp()
                                    }
                                });

                                if is_excluded {
                                    continue;
                                }

                                // Check if there is a recurrence override for this occurrence
                                let has_override = if let Some(ov_list) = overrides_map.get(&raw.id) {
                                    ov_list.iter().any(|(rec_dt, _)| {
                                        let rec_local = rec_dt.with_timezone(&chrono::Local);
                                        let day_local = day.with_timezone(&chrono::Local);
                                        rec_local.year() == day_local.year() &&
                                        rec_local.month() == day_local.month() &&
                                        rec_local.day() == day_local.day() &&
                                        rec_local.hour() == day_local.hour() &&
                                        rec_local.minute() == day_local.minute()
                                    })
                                } else {
                                    false
                                };

                                if has_override {
                                    continue;
                                }

                                occurrence_count += 1;
                                if let Some(max_count) = rrule.count {
                                    if occurrence_count > max_count {
                                        break;
                                    }
                                }

                                let occurrence_end = day + duration;
                                if occurrence_end >= range_start && day <= range_end {
                                    let start_val = if start_is_all_day {
                                        day.format("%Y-%m-%d").to_string()
                                    } else {
                                        day.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                                    };
                                    let end_val = if start_is_all_day {
                                        occurrence_end.format("%Y-%m-%d").to_string()
                                    } else {
                                        occurrence_end.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                                    };

                                    expanded.push(CalendarEvent {
                                        id: format!("{}-occurrence-{}", raw.id, day.timestamp()),
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
                    } else {
                        // For DAILY, MONTHLY, YEARLY, and WEEKLY (without BYDAY)
                        let matches_byday = if rrule.byday.is_empty() {
                            true
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

                        // Check if this occurrence is excluded via EXDATE
                        let is_excluded = parsed_exdates.iter().any(|(ex_dt, ex_is_all_day)| {
                            if *ex_is_all_day || start_is_all_day {
                                ex_dt.year() == current_start.year() && ex_dt.month() == current_start.month() && ex_dt.day() == current_start.day()
                            } else {
                                ex_dt.timestamp() == current_start.timestamp()
                            }
                        });

                        // Check if there is a recurrence override for this occurrence
                        let has_override = if let Some(ov_list) = overrides_map.get(&raw.id) {
                            ov_list.iter().any(|(rec_dt, _)| {
                                let rec_local = rec_dt.with_timezone(&chrono::Local);
                                let current_start_local = current_start.with_timezone(&chrono::Local);
                                rec_local.year() == current_start_local.year() &&
                                rec_local.month() == current_start_local.month() &&
                                rec_local.day() == current_start_local.day() &&
                                rec_local.hour() == current_start_local.hour() &&
                                rec_local.minute() == current_start_local.minute()
                            })
                        } else {
                            false
                        };

                        if !is_excluded && matches_byday && !has_override {
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
                                    id: format!("{}-occurrence-{}", raw.id, current_start.timestamp()),
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

                    match rrule.freq.as_str() {
                        "DAILY" => {
                            current_start = current_start + chrono::Duration::days(rrule.interval as i64);
                            current_end = current_start + duration;
                        }
                        "WEEKLY" => {
                            current_start = current_start + chrono::Duration::days((rrule.interval * 7) as i64);
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
            // Check if this single event is cancelled or declined
            let status = raw.status.clone().unwrap_or_else(|| "CONFIRMED".to_string());
            if status.trim().to_uppercase() != "CANCELLED" && !raw.is_declined {
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
    }

    // Now process all active overrides
    for raw in overrides {
        let status = raw.status.clone().unwrap_or_else(|| "CONFIRMED".to_string());
        if status.trim().to_uppercase() == "CANCELLED" || raw.is_declined {
            continue; // Skipped override (deleted occurrence)
        }

        if let Some(base_start) = ics_to_datetime(&raw.start_raw) {
            if let Some(base_end) = ics_to_datetime(&raw.end_raw) {
                if base_end >= range_start && base_start <= range_end {
                    let start_is_all_day = raw.start_raw.trim().len() == 8;
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
                        id: format!("{}-override-{}", raw.id, base_start.timestamp()),
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
    }

    // Deduplicate by summary and start time
    let mut unique = Vec::new();
    for event in expanded {
        let start_val = event.start.date_time.as_ref().or(event.start.date.as_ref()).cloned();
        let is_dup = unique.iter().any(|u: &CalendarEvent| {
            let u_start = u.start.date_time.as_ref().or(u.start.date.as_ref()).cloned();
            u.summary == event.summary && u_start == start_val
        });
        if !is_dup {
            unique.push(event);
        }
    }

    unique.sort_by(|a, b| {
        let a_start = a.start.date_time.as_ref().or(a.start.date.as_ref()).unwrap();
        let b_start = b.start.date_time.as_ref().or(b.start.date.as_ref()).unwrap();
        a_start.cmp(b_start)
    });

    unique
}

fn extract_email_from_url(url: &str) -> Option<String> {
    let prefix = "/ical/";
    if let Some(start_idx) = url.find(prefix) {
        let email_start = start_idx + prefix.len();
        if let Some(end_idx) = url[email_start..].find('/') {
            let encoded_email = &url[email_start..email_start + end_idx];
            if let Ok(decoded) = urlencoding::decode(encoded_email) {
                return Some(decoded.into_owned());
            }
        }
    }
    None
}

pub fn parse_ics(text: &str, owner_email: Option<&str>) -> Vec<CalendarEvent> {
    let lines = unfold_ics(text);
    let mut raw_events = Vec::new();

    let mut current_id: Option<String> = None;
    let mut current_summary: Option<String> = None;
    let mut current_start: Option<String> = None;
    let mut current_end: Option<String> = None;
    let mut current_rrule: Option<String> = None;
    let mut current_exdates: Vec<String> = Vec::new();
    let mut current_status: Option<String> = None;
    let mut current_recurrence_id: Option<String> = None;
    let mut is_declined = false;
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
            current_exdates.clear();
            current_status = None;
            current_recurrence_id = None;
            is_declined = false;
        } else if line.starts_with("END:VEVENT") {
            if in_event {
                let id = current_id.clone().unwrap_or_else(|| format!("event-{}", raw_events.len()));
                let summary = current_summary.clone().unwrap_or_else(|| "No Title".to_string());
                let status = current_status.clone();

                if let Some(start_raw) = current_start.clone() {
                    if let Some(end_raw) = current_end.clone() {
                        raw_events.push(RawEvent {
                            id,
                            summary,
                            start_raw,
                            end_raw,
                            rrule: current_rrule.clone(),
                            exdates: current_exdates.clone(),
                            recurrence_id: current_recurrence_id.clone(),
                            status,
                            is_declined,
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
                    "STATUS" => current_status = Some(val_part.to_string()),
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
                    "EXDATE" => {
                        for ex in val_part.split(',') {
                            let trimmed = ex.trim();
                            if !trimmed.is_empty() {
                                current_exdates.push(trimmed.to_string());
                            }
                        }
                    }
                    "RECURRENCE-ID" => current_recurrence_id = Some(val_part.to_string()),
                    "ATTENDEE" => {
                        if let Some(owner) = owner_email {
                            let line_upper = line.to_uppercase();
                            let owner_upper = owner.to_uppercase();
                            if line_upper.contains("PARTSTAT=DECLINED") && line_upper.contains(&owner_upper) {
                                is_declined = true;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    // Set expansion window: from 7 days ago to +14 days into the future
    let now = chrono::Utc::now();
    let range_start = now - chrono::Duration::days(7);
    let range_end = now + chrono::Duration::days(14);

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
    let owner_email = extract_email_from_url(url);
    let events = parse_ics(&body, owner_email.as_deref());
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_recurrence_weekly_byday() {
        let raw = RawEvent {
            id: "test-event".to_string(),
            summary: "Weekly Routine".to_string(),
            start_raw: "20260601T070000".to_string(), // Monday, June 1, 2026
            end_raw: "20260601T080000".to_string(),
            rrule: Some("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR".to_string()),
            exdates: vec![],
            recurrence_id: None,
            status: None,
            is_declined: false,
        };

        // We want to expand from June 28, 2026 to July 4, 2026
        let range_start = chrono::Utc.with_ymd_and_hms(2026, 6, 28, 0, 0, 0).unwrap();
        let range_end = chrono::Utc.with_ymd_and_hms(2026, 7, 4, 23, 59, 59).unwrap();

        let events = expand_raw_events(vec![raw], range_start, range_end);

        for event in &events {
            println!("Event: {} at {:?}", event.summary, event.start.date_time);
        }

        // June 28 (Sun) -> No
        // June 29 (Mon) -> Yes (7:00 AM)
        // June 30 (Tue) -> Yes (7:00 AM)
        // July 1 (Wed) -> Yes (7:00 AM)
        // July 2 (Thu) -> Yes (7:00 AM)
        // July 3 (Fri) -> Yes (7:00 AM)
        // July 4 (Sat) -> No
        assert_eq!(events.len(), 5);
        assert!(events[0].start.date_time.as_ref().unwrap().contains("2026-06-29"));
        assert!(events[1].start.date_time.as_ref().unwrap().contains("2026-06-30"));
        assert!(events[2].start.date_time.as_ref().unwrap().contains("2026-07-01"));
        assert!(events[3].start.date_time.as_ref().unwrap().contains("2026-07-02"));
        assert!(events[4].start.date_time.as_ref().unwrap().contains("2026-07-03"));
    }

    #[test]
    fn test_recurrence_weekly_exdate() {
        let raw = RawEvent {
            id: "test-event-ex".to_string(),
            summary: "Weekly Routine with Exclusion".to_string(),
            start_raw: "20260601T070000".to_string(), // Monday, June 1, 2026
            end_raw: "20260601T080000".to_string(),
            rrule: Some("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR".to_string()),
            exdates: vec![
                "20260630T070000".to_string(), // Exclude Tuesday, June 30
                "20260702T070000".to_string(), // Exclude Thursday, July 2
            ],
            recurrence_id: None,
            status: None,
            is_declined: false,
        };

        let range_start = chrono::Utc.with_ymd_and_hms(2026, 6, 28, 0, 0, 0).unwrap();
        let range_end = chrono::Utc.with_ymd_and_hms(2026, 7, 4, 23, 59, 59).unwrap();

        let events = expand_raw_events(vec![raw], range_start, range_end);

        // Expected occurrences:
        // June 29 (Mon) -> Yes
        // June 30 (Tue) -> Excluded
        // July 1 (Wed) -> Yes
        // July 2 (Thu) -> Excluded
        // July 3 (Fri) -> Yes
        assert_eq!(events.len(), 3);
        assert!(events[0].start.date_time.as_ref().unwrap().contains("2026-06-29"));
        assert!(events[1].start.date_time.as_ref().unwrap().contains("2026-07-01"));
        assert!(events[2].start.date_time.as_ref().unwrap().contains("2026-07-03"));
    }

    #[test]
    fn test_cancelled_status_filtering() {
        let ics_data = "BEGIN:VCALENDAR\n\
                        VERSION:2.0\n\
                        PRODID:-//Google Inc//Google Calendar 70.9054//EN\n\
                        BEGIN:VEVENT\n\
                        UID:event-active@google.com\n\
                        SUMMARY:Active Event\n\
                        DTSTART:20260701T100000Z\n\
                        DTEND:20260701T110000Z\n\
                        STATUS:CONFIRMED\n\
                        END:VEVENT\n\
                        BEGIN:VEVENT\n\
                        UID:event-cancelled@google.com\n\
                        SUMMARY:Cancelled Event\n\
                        DTSTART:20260701T120000Z\n\
                        DTEND:20260701T130000Z\n\
                        STATUS:CANCELLED\n\
                        END:VEVENT\n\
                        END:VCALENDAR";

        let events = parse_ics(ics_data, None);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].summary, "Active Event");
    }

    #[test]
    fn test_declined_attendee_filtering() {
        let ics_data = "BEGIN:VCALENDAR\n\
                        VERSION:2.0\n\
                        BEGIN:VEVENT\n\
                        UID:event-accepted@google.com\n\
                        SUMMARY:Accepted Event\n\
                        DTSTART:20260701T100000Z\n\
                        DTEND:20260701T110000Z\n\
                        ATTENDEE;PARTSTAT=ACCEPTED:mailto:user@example.com\n\
                        END:VEVENT\n\
                        BEGIN:VEVENT\n\
                        UID:event-declined@google.com\n\
                        SUMMARY:Declined Event\n\
                        DTSTART:20260701T120000Z\n\
                        DTEND:20260701T130000Z\n\
                        ATTENDEE;PARTSTAT=DECLINED:mailto:user@example.com\n\
                        END:VEVENT\n\
                        END:VCALENDAR";

        let events = parse_ics(ics_data, Some("user@example.com"));
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].summary, "Accepted Event");
    }

    #[test]
    fn test_recurrence_override_cancellation() {
        let ics_data = "BEGIN:VCALENDAR\n\
                        VERSION:2.0\n\
                        BEGIN:VEVENT\n\
                        UID:recurring-1@google.com\n\
                        SUMMARY:Weekly Sync\n\
                        DTSTART:20260602T100000\n\
                        DTEND:20260602T110000\n\
                        RRULE:FREQ=WEEKLY;BYDAY=TU\n\
                        END:VEVENT\n\
                        BEGIN:VEVENT\n\
                        UID:recurring-1@google.com\n\
                        SUMMARY:Weekly Sync\n\
                        DTSTART:20260630T100000\n\
                        DTEND:20260630T110000\n\
                        RECURRENCE-ID:20260630T100000\n\
                        STATUS:CANCELLED\n\
                        END:VEVENT\n\
                        END:VCALENDAR";

        let events = parse_ics(ics_data, None);
        // June 30, 2026 should be excluded because of the recurrence override cancellation.
        let has_june_30 = events.iter().any(|e| {
            let start = e.start.date_time.as_ref().or(e.start.date.as_ref()).unwrap();
            start.contains("2026-06-30")
        });
        assert!(!has_june_30, "June 30 occurrence should be excluded due to cancellation override");
    }
}
