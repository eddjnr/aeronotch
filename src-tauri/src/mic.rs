use serde::{Deserialize, Serialize};
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eCapture, eConsole, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED};

/// Current state of the default microphone (capture) device.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, Default, PartialEq)]
pub struct MicStatus {
    pub is_muted: bool,
    /// Whether a default capture (microphone) device is currently available.
    pub has_device: bool,
}

/// Ensures COM is initialized on the calling thread.
///
/// Uses `thread_local!` because `tokio::task::spawn_blocking` can run the
/// closure on any thread-pool thread — each thread must initialise COM for
/// itself.  A plain `OnceLock` would only initialise the first thread that
/// happens to call this function, leaving other threads uninitialised.
fn ensure_com_initialized() {
    thread_local! {
        static INITIALIZED: std::cell::Cell<bool> = std::cell::Cell::new(false);
    }
    INITIALIZED.with(|init| {
        if !init.get() {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            }
            init.set(true);
        }
    });
}

fn get_enumerator() -> Result<IMMDeviceEnumerator, String> {
    ensure_com_initialized();
    unsafe {
        CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())
    }
}

/// Obtains the `IAudioEndpointVolume` interface for the default capture (microphone) device.
fn get_capture_endpoint_volume() -> Result<IAudioEndpointVolume, String> {
    let enumerator = get_enumerator()?;

    unsafe {
        let device = enumerator
            .GetDefaultAudioEndpoint(eCapture, eConsole)
            .map_err(|e| e.to_string())?;

        let endpoint_volume: IAudioEndpointVolume =
            device.Activate(CLSCTX_ALL, None).map_err(|e| e.to_string())?;

        Ok(endpoint_volume)
    }
}

/// Reads the current mute state of the default microphone.
/// Returns `has_device: false` (and `is_muted: false`) if no capture device is present.
pub fn get_mic_status() -> MicStatus {
    match get_capture_endpoint_volume() {
        Ok(endpoint) => {
            let is_muted = unsafe { endpoint.GetMute() }.map(|b| b.as_bool()).unwrap_or(false);
            MicStatus {
                is_muted,
                has_device: true,
            }
        }
        Err(_) => MicStatus {
            is_muted: false,
            has_device: false,
        },
    }
}

/// Sets the mute state of the default microphone explicitly.
pub fn set_mic_mute(mute: bool) -> Result<MicStatus, String> {
    let endpoint = get_capture_endpoint_volume()?;
    unsafe {
        endpoint
            .SetMute(mute, std::ptr::null())
            .map_err(|e| e.to_string())?;
    }
    Ok(MicStatus {
        is_muted: mute,
        has_device: true,
    })
}

/// Toggles the mute state of the default microphone and returns the resulting status.
/// Ideal for a single quick-action button ("mute/unmute for calls").
pub fn toggle_mic_mute() -> Result<MicStatus, String> {
    let endpoint = get_capture_endpoint_volume()?;
    unsafe {
        let current = endpoint.GetMute().map_err(|e| e.to_string())?.as_bool();
        let next = !current;
        endpoint
            .SetMute(next, std::ptr::null())
            .map_err(|e| e.to_string())?;
        Ok(MicStatus {
            is_muted: next,
            has_device: true,
        })
    }
}
