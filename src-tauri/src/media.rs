use serde::{Deserialize, Serialize};
use base64::{prelude::BASE64_STANDARD, Engine};
use lru::LruCache;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::{Buffer, InputStreamOptions};
use std::num::NonZeroUsize;
use std::sync::{Mutex, OnceLock};

/// LRU cache keyed by (title, artist, album) to avoid redundant Base64 extraction.
/// Bounded at 30 entries — oldest entries are evicted automatically.
type CacheKey = (String, String, String);

const MAX_CACHE_ENTRIES: usize = 30;
/// Maximum size in bytes for a single cached thumbnail (base64 string).
/// ~1.5 MB raw image equivalent. Larger thumbnails are not cached.
const MAX_THUMBNAIL_BYTES: usize = 2_000_000;

static THUMBNAIL_CACHE: OnceLock<Mutex<LruCache<CacheKey, Option<String>>>> = OnceLock::new();

fn get_cache() -> &'static Mutex<LruCache<CacheKey, Option<String>>> {
    THUMBNAIL_CACHE.get_or_init(|| {
        Mutex::new(LruCache::new(NonZeroUsize::new(MAX_CACHE_ENTRIES).unwrap()))
    })
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

fn is_allowed_media_app(app_name: &str) -> bool {
    let app_name_lower = app_name.to_lowercase();
    let keywords = [
        "spotify",
        "deezer",
        "chrome",
        "edge",
        "msedge",
        "firefox",
        "mozilla",
        "brave",
        "opera",
        "vivaldi",
        "arc",
        "safari",
        "apple.music",
        "applemusic",
        "itunes",
        "tidal",
        "amazonmusic",
        "amazon.music",
        "youtubemusic",
        "youtube music",
        "vlc",
        "foobar2000",
        "winamp",
        "aimp",
        "roon",
        "musicbee",
        "groove",
        "zunemusic",
        "wmplayer",
        "media.player",
    ];
    keywords.iter().any(|&kw| app_name_lower.contains(kw))
}

impl MediaInfo {
    /// Attempts to get the currently playing media info from the OS using SMTC.
    pub async fn get_current() -> Option<MediaInfo> {
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .ok()?
            .get() // Use blocking .get() since WinRT types don't implement Future directly in this environment
            .ok()?;

        let mut target_session = None;

        // 1. Try CurrentSession first
        if let Ok(current_session) = manager.GetCurrentSession() {
            if let Ok(app_id) = current_session.SourceAppUserModelId() {
                if is_allowed_media_app(&app_id.to_string()) {
                    target_session = Some(current_session);
                }
            }
        }

        // 2. If CurrentSession is not allowed or failed, check all sessions
        if target_session.is_none() {
            if let Ok(sessions) = manager.GetSessions() {
                // Find a session that is allowed and playing
                for session in &sessions {
                    if let Ok(app_id) = session.SourceAppUserModelId() {
                        if is_allowed_media_app(&app_id.to_string()) {
                            if let Ok(playback_info) = session.GetPlaybackInfo() {
                                if let Ok(status) = playback_info.PlaybackStatus() {
                                    if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                                        target_session = Some(session.clone());
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // If still none, find the first allowed session (even if not playing/paused)
                if target_session.is_none() {
                    for session in &sessions {
                        if let Ok(app_id) = session.SourceAppUserModelId() {
                            if is_allowed_media_app(&app_id.to_string()) {
                                target_session = Some(session.clone());
                                break;
                            }
                        }
                    }
                }
            }
        }

        let session = target_session?;
        
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

        // Read thumbnail as Base64 Data URL (using LRU cache keyed by title+artist+album)
        let mut thumbnail_url = None;
        let cache = get_cache();
        let mut cache_guard = cache.lock().unwrap();
        let cache_key = (title.clone(), artist.clone(), album.clone());

        if let Some(cached) = cache_guard.get(&cache_key) {
            thumbnail_url = cached.clone();
        }

        if thumbnail_url.is_none() && !title.is_empty() {
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
                                // Cap thumbnail size to avoid memory bloat
                                if url.len() <= MAX_THUMBNAIL_BYTES {
                                    thumbnail_url = Some(url.clone());
                                    cache_guard.put(cache_key.clone(), Some(url));
                                } else {
                                    // Still use the thumbnail but don't cache it
                                    thumbnail_url = Some(url);
                                }
                            }
                        }
                    }
                }
            }
            if thumbnail_url.is_none() {
                cache_guard.put(cache_key, None);
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
