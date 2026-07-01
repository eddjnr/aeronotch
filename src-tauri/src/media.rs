use serde::{Deserialize, Serialize};
use base64::{prelude::BASE64_STANDARD, Engine};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::{Buffer, InputStreamOptions};
use std::sync::{Mutex, OnceLock};

// Memory cache for active track metadata to avoid redundant Base64 extraction / stream reads
static METADATA_CACHE: OnceLock<Mutex<Option<(String, Option<String>)>>> = OnceLock::new();

fn get_cache() -> &'static Mutex<Option<(String, Option<String>)>> {
    METADATA_CACHE.get_or_init(|| Mutex::new(None))
}

/// Information about the currently playing media track.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MediaInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub is_playing: bool,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub thumbnail_url: Option<String>,
    pub app_name: Option<String>,
}

impl MediaInfo {
    /// Attempts to get the currently playing media info from the OS using SMTC.
    pub async fn get_current() -> Option<MediaInfo> {
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .ok()?
            .get() // Use blocking .get() since WinRT types don't implement Future directly in this environment
            .ok()?;

        let session = manager.GetCurrentSession().ok()?;
        
        // App name (e.g. Spotify.exe, Chrome.exe)
        let app_name = session.SourceAppUserModelId()
            .map(|id| id.to_string())
            .ok();

        // Playback Status & timeline info
        let playback_info = session.GetPlaybackInfo().ok()?;
        let status = playback_info.PlaybackStatus().ok()?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        let timeline = session.GetTimelineProperties().ok()?;
        let position_ticks = timeline.Position().ok()?.Duration;
        let last_updated_ticks = timeline.LastUpdatedTime().ok()?.UniversalTime;

        // Get current system time in Windows file time format (100-ns intervals since 1601)
        let current_time_ticks = {
            use std::time::SystemTime;
            let epoch = SystemTime::UNIX_EPOCH;
            let now = SystemTime::now();
            let duration = now.duration_since(epoch).unwrap_or_default();
            // UNIX epoch is 11,644,473,600 seconds after Windows epoch (1601)
            let file_time_secs = duration.as_secs() + 11_644_473_600;
            let file_time_100ns = file_time_secs * 10_000_000 + (duration.subsec_nanos() / 100) as u64;
            file_time_100ns as i64
        };

        // If playing, calculate elapsed ticks. If paused, elapsed is 0.
        let elapsed_ticks = if is_playing {
            (current_time_ticks - last_updated_ticks).max(0)
        } else {
            0
        };

        let duration_ticks = timeline.EndTime().ok()?.Duration;
        let total_position_ticks = (position_ticks + elapsed_ticks).min(duration_ticks).max(0);

        let position_seconds = total_position_ticks as f64 / 10_000_000.0;
        let duration_seconds = duration_ticks as f64 / 10_000_000.0;

        // Media properties
        let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
        let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
        let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();
        let album = props.AlbumTitle().map(|s| s.to_string()).unwrap_or_default();

        // Read thumbnail as Base64 Data URL (using cache if song is same)
        let mut thumbnail_url = None;
        let cache = get_cache();
        let mut cache_guard = cache.lock().unwrap();

        let needs_fetch = match &*cache_guard {
            Some((cached_title, cached_thumb)) if cached_title == &title => {
                thumbnail_url = cached_thumb.clone();
                false
            }
            _ => true,
        };

        if needs_fetch && !title.is_empty() {
            if let Ok(ref stream_ref) = props.Thumbnail() {
                if let Ok(stream) = stream_ref.OpenReadAsync().ok()?.get() {
                    let size = stream.Size().unwrap_or(0) as u32;
                    if size > 0 {
                        let buffer = Buffer::Create(size).unwrap();
                        if let Ok(_) = stream.ReadAsync(&buffer, size, InputStreamOptions::None).ok()?.get() {
                            let reader = windows::Storage::Streams::DataReader::FromBuffer(&buffer).unwrap();
                            let mut bytes = vec![0u8; size as usize];
                            if reader.ReadBytes(&mut bytes).is_ok() {
                                let content_type = stream.ContentType().map(|s| s.to_string()).unwrap_or("image/png".to_string());
                                let b64 = BASE64_STANDARD.encode(&bytes);
                                let url = format!("data:{};base64,{}", content_type, b64);
                                thumbnail_url = Some(url.clone());
                                *cache_guard = Some((title.clone(), Some(url)));
                            }
                        }
                    }
                }
            }
            if thumbnail_url.is_none() {
                *cache_guard = Some((title.clone(), None));
            }
        }

        Some(MediaInfo {
            title,
            artist,
            album,
            is_playing,
            position_seconds,
            duration_seconds,
            thumbnail_url,
            app_name,
        })
    }
}

/// Actions the frontend can request on the active media session.
#[derive(Debug, Deserialize)]
pub enum MediaAction {
    PlayPause,
    Next,
    Previous,
}

impl MediaAction {
    /// Execute the media control action.
    pub async fn execute(&self) -> Result<(), String> {
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|e| e.to_string())?
            .get()
            .map_err(|e| e.to_string())?;

        let session = manager.GetCurrentSession().map_err(|e| e.to_string())?;
        
        let success = match self {
            MediaAction::PlayPause => {
                session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?.get()
            }
            MediaAction::Next => {
                session.TrySkipNextAsync().map_err(|e| e.to_string())?.get()
            }
            MediaAction::Previous => {
                session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.get()
            }
        };
        
        match success {
            Ok(true) => Ok(()),
            Ok(false) => Err("Action was sent but rejected by the media session".to_string()),
            Err(e) => Err(e.to_string()),
        }
    }
}
