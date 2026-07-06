use chrono::TimeZone;
use super::{CalendarEvent, RawEvent};

pub struct ParsedRRule {
    pub freq: String,
    pub until: Option<chrono::DateTime<chrono::Utc>>,
    pub count: Option<usize>,
    pub byday: Vec<String>,
    pub interval: usize,
}

pub fn unfold_ics(raw_text: &str) -> Vec<String> {
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

pub fn extract_email_from_url(url: &str) -> Option<String> {
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

fn parse_ics_date(raw: &str) -> Option<(String, bool)> {
    let clean = raw.trim();
    if clean.len() < 8 {
        return None;
    }

    let year = &clean[0..4];
    let month = &clean[4..6];
    let day = &clean[6..8];

    if clean.len() == 8 {
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
                false,
            ));
        }
    }
    None
}

pub fn ics_to_datetime(raw: &str) -> Option<chrono::DateTime<chrono::Utc>> {
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

pub fn parse_rrule(rrule_str: &str) -> Option<ParsedRRule> {
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

    let now = chrono::Utc::now();
    let range_start = now - chrono::Duration::days(7);
    let range_end = now + chrono::Duration::days(14);

    super::rrule::expand_raw_events(raw_events, range_start, range_end)
    // This creates a circular dependency: parser.rs -> super::rrule -> super::parser
    // Actually no, rrule.rs only uses RawEvent, CalendarEvent, CalendarEventTime from mod.rs
    // It doesn't use parser.rs. So no circular dependency.
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let has_june_30 = events.iter().any(|e| {
            let start = e.start.date_time.as_ref().or(e.start.date.as_ref()).unwrap();
            start.contains("2026-06-30")
        });
        assert!(!has_june_30, "June 30 occurrence should be excluded due to cancellation override");
    }
}
