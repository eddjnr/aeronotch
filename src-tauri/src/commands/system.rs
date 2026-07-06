use crate::system_info::{SystemMonitor, SystemStats};
use std::sync::Arc;

#[tauri::command]
pub fn get_system_info(state: tauri::State<'_, Arc<SystemMonitor>>) -> SystemStats {
    state.get_stats()
}
