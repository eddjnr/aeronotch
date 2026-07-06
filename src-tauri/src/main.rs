// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Ensure COM is initialized as STA on the main thread before tao creates the window.
    // This prevents RPC_E_CHANGED_MODE crashes when multiple crates touch COM.
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }

    aeronotch_lib::run()
}
