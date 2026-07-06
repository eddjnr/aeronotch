use crate::mic::MicStatus;

#[tauri::command]
pub fn get_mic_status() -> MicStatus {
    crate::mic::get_mic_status()
}

#[tauri::command]
pub fn set_mic_mute(mute: bool) -> Result<MicStatus, String> {
    crate::mic::set_mic_mute(mute)
}

#[tauri::command]
pub fn toggle_mic_mute() -> Result<MicStatus, String> {
    crate::mic::toggle_mic_mute()
}
