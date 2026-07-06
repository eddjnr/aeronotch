use chrono::{Datelike, Timelike};
use super::{CalendarEvent, CalendarEventTime, RawEvent};

pub fn expand_raw_events(
    raw_events: Vec<RawEvent>,
    range_start: chrono::DateTime<chrono::Utc>,
    range_end: chrono::DateTime<chrono::Utc>,
) -> Vec<CalendarEvent> {
    let mut expanded = Vec::new();

    let mut overrides_map: std::collections::HashMap<String, Vec<(chrono::DateTime<chrono::Utc>, RawEvent)>> =
        std::collections::HashMap::new();

    let mut masters = Vec::new();
    let mut overrides = Vec::new();

    for raw in raw_events {
        if let Some(ref rec_id_raw) = raw.recurrence_id {
            if let Some(rec_dt) = super::parser::ics_to_datetime(rec_id_raw) {
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
        let status = raw.status.clone().unwrap_or_else(|| "CONFIRMED".to_string());
        if status.trim().to_uppercase() == "CANCELLED" || raw.is_declined {
            continue;
        }

        let base_start = match super::parser::ics_to_datetime(&raw.start_raw) {
            Some(dt) => dt,
            None => continue,
        };
        let base_end = match super::parser::ics_to_datetime(&raw.end_raw) {
            Some(dt) => dt,
            None => continue,
        };

        let start_is_all_day = raw.start_raw.trim().len() == 8;

        let mut parsed_exdates = Vec::new();
        for ex in &raw.exdates {
            if let Some(ex_dt) = super::parser::ics_to_datetime(ex) {
                let ex_is_all_day = ex.trim().len() == 8;
                parsed_exdates.push((ex_dt, ex_is_all_day));
            }
        }

        if let Some(rrule_str) = raw.rrule.as_ref() {
            if let Some(rrule) = super::parser::parse_rrule(rrule_str) {
                let duration = base_end.signed_duration_since(base_start);
                let mut current_start = base_start;
                let mut current_end = base_end;
                let mut occurrence_count = 0;

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

                                let has_override = if let Some(ov_list) = overrides_map.get(&raw.id) {
                                    ov_list.iter().any(|(rec_dt, _)| {
                                        let rec_local = rec_dt.with_timezone(&chrono::Local);
                                        let day_local = day.with_timezone(&chrono::Local);
                                        rec_local.year() == day_local.year()
                                            && rec_local.month() == day_local.month()
                                            && rec_local.day() == day_local.day()
                                            && rec_local.hour() == day_local.hour()
                                            && rec_local.minute() == day_local.minute()
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

                        let is_excluded = parsed_exdates.iter().any(|(ex_dt, ex_is_all_day)| {
                            if *ex_is_all_day || start_is_all_day {
                                ex_dt.year() == current_start.year()
                                    && ex_dt.month() == current_start.month()
                                    && ex_dt.day() == current_start.day()
                            } else {
                                ex_dt.timestamp() == current_start.timestamp()
                            }
                        });

                        let has_override = if let Some(ov_list) = overrides_map.get(&raw.id) {
                            ov_list.iter().any(|(rec_dt, _)| {
                                let rec_local = rec_dt.with_timezone(&chrono::Local);
                                let current_start_local = current_start.with_timezone(&chrono::Local);
                                rec_local.year() == current_start_local.year()
                                    && rec_local.month() == current_start_local.month()
                                    && rec_local.day() == current_start_local.day()
                                    && rec_local.hour() == current_start_local.hour()
                                    && rec_local.minute() == current_start_local.minute()
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

    for raw in overrides {
        let status = raw.status.clone().unwrap_or_else(|| "CONFIRMED".to_string());
        if status.trim().to_uppercase() == "CANCELLED" || raw.is_declined {
            continue;
        }

        if let Some(base_start) = super::parser::ics_to_datetime(&raw.start_raw) {
            if let Some(base_end) = super::parser::ics_to_datetime(&raw.end_raw) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_recurrence_weekly_byday() {
        let raw = RawEvent {
            id: "test-event".to_string(),
            summary: "Weekly Routine".to_string(),
            start_raw: "20260601T070000".to_string(),
            end_raw: "20260601T080000".to_string(),
            rrule: Some("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR".to_string()),
            exdates: vec![],
            recurrence_id: None,
            status: None,
            is_declined: false,
        };

        let range_start = chrono::Utc.with_ymd_and_hms(2026, 6, 28, 0, 0, 0).unwrap();
        let range_end = chrono::Utc.with_ymd_and_hms(2026, 7, 4, 23, 59, 59).unwrap();

        let events = expand_raw_events(vec![raw], range_start, range_end);
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
            start_raw: "20260601T070000".to_string(),
            end_raw: "20260601T080000".to_string(),
            rrule: Some("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR".to_string()),
            exdates: vec![
                "20260630T070000".to_string(),
                "20260702T070000".to_string(),
            ],
            recurrence_id: None,
            status: None,
            is_declined: false,
        };

        let range_start = chrono::Utc.with_ymd_and_hms(2026, 6, 28, 0, 0, 0).unwrap();
        let range_end = chrono::Utc.with_ymd_and_hms(2026, 7, 4, 23, 59, 59).unwrap();

        let events = expand_raw_events(vec![raw], range_start, range_end);
        assert_eq!(events.len(), 3);
        assert!(events[0].start.date_time.as_ref().unwrap().contains("2026-06-29"));
        assert!(events[1].start.date_time.as_ref().unwrap().contains("2026-07-01"));
        assert!(events[2].start.date_time.as_ref().unwrap().contains("2026-07-03"));
    }
}
