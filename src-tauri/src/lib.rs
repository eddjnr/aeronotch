mod app;
pub mod commands;
pub mod error;
pub mod google_calendar;
pub mod island_hit_test;
pub mod media;
pub mod mic;
pub mod system_info;
pub mod weather;
pub mod wmi_metrics;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run()
}
