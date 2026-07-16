use serde::{Deserialize, Serialize};
use base64::{prelude::BASE64_STANDARD, Engine};
use lru::LruCache;
use windows::Foundation::{AsyncStatus, IAsyncInfo, IAsyncOperation, IAsyncOperationWithProgress};
use windows::core::Interface;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    GlobalSystemMediaTransportControlsSession,
};
use windows::Storage::Streams::{Buffer, InputStreamOptions};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use std::num::NonZeroUsize;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio::sync::{oneshot, mpsc};
use std::thread;

// ── Thumbnail LRU Cache with TTL ─────────────────────────────────

type CacheKey = (String, String, String);

const MAX_CACHE_ENTRIES: usize = 30;
const MAX_THUMBNAIL_BYTES: usize = 2_000_000;
/// Thumbnails older than this are re-fetched on next play of same track.
const CACHE_TTL: Duration = Duration::from_secs(300);

// Timeouts individuais por operação assíncrona do WinRT.
// Isso é o que garante que a thread única do worker NUNCA fica presa
// pra sempre — pior caso, ela fica ocupada por esse tempo e volta.
const OP_TIMEOUT_REQUEST_MANAGER: Duration = Duration::from_secs(2);
const OP_TIMEOUT_MEDIA_PROPS: Duration = Duration::from_millis(800);
const OP_TIMEOUT_STREAM_OPEN: Duration = Duration::from_millis(500);
const OP_TIMEOUT_STREAM_READ: Duration = Duration::from_millis(500);
const OP_TIMEOUT_ACTION: Duration = Duration::from_millis(1500);

// Quantas falhas seguidas de get_current() até forçarmos a recriação
// do SessionManager (comum após sleep/resume ou reinício do serviço
// de áudio do Windows). Só conta falha REAL — "sem mídia tocando" não
// entra aqui, é um estado normal e esperado.
const MAX_FAILURES_BEFORE_RESET: u32 = 3;

struct CachedThumbnail {
    data: Option<String>,
    fetched_at: std::time::Instant,
}

static THUMBNAIL_CACHE: OnceLock<Mutex<LruCache<CacheKey, CachedThumbnail>>> = OnceLock::new();

fn get_cache() -> &'static Mutex<LruCache<CacheKey, CachedThumbnail>> {
    THUMBNAIL_CACHE.get_or_init(|| {
        Mutex::new(LruCache::new(NonZeroUsize::new(MAX_CACHE_ENTRIES).unwrap()))
    })
}

/// Waits for an IAsyncOperation<T> with a real, cancellable timeout.
/// Unlike `.get()`, this never blocks the thread indefinitely:
/// if the timeout fires, Cancel()/Close() are called and control is
/// returned immediately — essential in a single-threaded architecture.
fn wait_async<T>(op: &IAsyncOperation<T>, timeout: Duration) -> Option<T>
where
    T: windows::core::RuntimeType + 'static,
{
    let start = std::time::Instant::now();
    loop {
        match op.Status() {
            Ok(AsyncStatus::Completed) => return op.GetResults().ok(),
            Ok(AsyncStatus::Error) | Ok(AsyncStatus::Canceled) => return None,
            Ok(AsyncStatus::Started) => {}
            _ => return None,
        }
        if start.elapsed() >= timeout {
            log::warn!("[media] async operation timed out, cancelling after {:?}", timeout);
            if let Ok(info) = op.cast::<IAsyncInfo>() {
                let _ = info.Cancel();
                let _ = info.Close();
            }
            return None;
        }
        thread::sleep(Duration::from_millis(15));
    }
}

/// Same logic as `wait_async`, but for IAsyncOperationWithProgress<T, P>
/// — used by progress-reporting calls like `Stream::ReadAsync`.
fn wait_async_with_progress<T, P>(
    op: &IAsyncOperationWithProgress<T, P>,
    timeout: Duration,
) -> Option<T>
where
    T: windows::core::RuntimeType + 'static,
    P: windows::core::RuntimeType + 'static,
{
    let start = std::time::Instant::now();
    loop {
        match op.Status() {
            Ok(AsyncStatus::Completed) => return op.GetResults().ok(),
            Ok(AsyncStatus::Error) | Ok(AsyncStatus::Canceled) => return None,
            Ok(AsyncStatus::Started) => {}
            _ => return None,
        }
        if start.elapsed() >= timeout {
            log::warn!("[media] async operation with progress timed out, cancelling after {:?}", timeout);
            if let Ok(info) = op.cast::<IAsyncInfo>() {
                let _ = info.Cancel();
                let _ = info.Close();
            }
            return None;
        }
        thread::sleep(Duration::from_millis(15));
    }
}

// ── Dedicated SMTC worker thread ──────────────────────────────────
//
// A single OS thread handles all COM/WinRT communication.
// CoInitializeEx is called ONCE (not per-request), and the thread
// lives for the entire app lifetime. This is the recommended pattern
// from the windows-rs community for SMTC: avoids repeated spawn
// overhead and keeps STA/MTA consistent for COM.
//
// The loop exits when all Senders are dropped (i.e., when the app
// is shutting down) — expected behaviour.

enum MediaRequest {
    GetCurrent {
        response: oneshot::Sender<Option<MediaInfo>>,
    },
    ExecuteAction {
        action: MediaAction,
        response: oneshot::Sender<Result<(), String>>,
    },
    Seek {
        position_seconds: f64,
        response: oneshot::Sender<Result<(), String>>,
    },
}

static WORKER_TX: OnceLock<mpsc::Sender<MediaRequest>> = OnceLock::new();

fn ensure_worker() -> mpsc::Sender<MediaRequest> {
    WORKER_TX
        .get_or_init(|| {
            let (tx, rx) = mpsc::channel::<MediaRequest>(16);
            thread::spawn(move || worker_main(rx));
            tx
        })
        .clone()
}

fn worker_main(mut rx: mpsc::Receiver<MediaRequest>) {
    let _ = unsafe { CoInitializeEx(Some(std::ptr::null()), COINIT_MULTITHREADED) };

    while let Some(request) = rx.blocking_recv() {
        match request {
            MediaRequest::GetCurrent { response } => {
                let outcome = MediaInfo::fetch_blocking();
                let result = match outcome {
                    FetchOutcome::Found(info) => {
                        // SessionManager funcionando normalmente.
                        track_result(true);
                        Some(info)
                    }
                    FetchOutcome::NoActiveSession => {
                        // Estado normal (nada tocando em app permitido) —
                        // NÃO conta como falha do SessionManager.
                        track_result(true);
                        None
                    }
                    FetchOutcome::ManagerUnavailable => {
                        // Falha real — essa sim conta pro reset.
                        track_result(false);
                        None
                    }
                };
                let _ = response.send(result);
            }
            MediaRequest::ExecuteAction { action, response } => {
                let _ = response.send(MediaAction::execute_action_blocking(action));
            }
            MediaRequest::Seek { position_seconds, response } => {
                let _ = response.send(seek_blocking(position_seconds));
            }
        }
    }
}

// ── Session Manager (cached, auto-resets after real failures) ────

static SESSION_MANAGER: Mutex<Option<GlobalSystemMediaTransportControlsSessionManager>> =
    Mutex::new(None);
static CONSECUTIVE_FAILURES: AtomicU32 = AtomicU32::new(0);

fn get_session_manager() -> Option<GlobalSystemMediaTransportControlsSessionManager> {
    {
        let guard = SESSION_MANAGER.lock().unwrap();
        if let Some(m) = guard.as_ref() {
            return Some(m.clone());
        }
    }

    let op = GlobalSystemMediaTransportControlsSessionManager::RequestAsync().ok()?;
    let manager = wait_async(&op, OP_TIMEOUT_REQUEST_MANAGER)?;

    let mut guard = SESSION_MANAGER.lock().unwrap();
    *guard = Some(manager.clone());
    Some(manager)
}

/// Called (only from the worker thread, so no races) after N
/// consecutive REAL failures of get_current(). "No media playing" is
/// NOT a failure — only counts when the SessionManager actually
/// doesn't respond.
fn track_result(success: bool) {
    if success {
        CONSECUTIVE_FAILURES.store(0, Ordering::Relaxed);
    } else {
        let failures = CONSECUTIVE_FAILURES.fetch_add(1, Ordering::Relaxed) + 1;
        if failures >= MAX_FAILURES_BEFORE_RESET {
            log::warn!("[media] resetting SessionManager after {} consecutive failures", failures);
            *SESSION_MANAGER.lock().unwrap() = None;
            CONSECUTIVE_FAILURES.store(0, Ordering::Relaxed);
        }
    }
}

// ── MediaInfo ─────────────────────────────────────────────────────

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

/// Internal result of a media fetch attempt — lets us distinguish
/// "no media playing" (normal state, doesn't count as failure) from
/// "real SMTC failure" (reason to reset the SessionManager).
enum FetchOutcome {
    Found(MediaInfo),
    NoActiveSession,
    ManagerUnavailable,
}

fn is_allowed_media_app(app_name: &str) -> bool {
    let app_name_lower = app_name.to_lowercase();
    let keywords = [
        "spotify", "deezer", "chrome", "edge", "msedge", "firefox", "mozilla",
        "brave", "opera", "vivaldi", "arc", "safari", "apple.music", "applemusic",
        "itunes", "tidal", "amazonmusic", "amazon.music", "youtubemusic",
        "youtube music", "vlc", "foobar2000", "winamp", "aimp", "roon",
        "musicbee", "groove", "zunemusic", "wmplayer", "media.player",
        "thorium", "chromium", "wavebox", "microsoft.spotify",
    ];
    keywords.iter().any(|&kw| app_name_lower.contains(kw))
}

/// Finds the first SMTC session from an allowed media app.
/// Priority: (1) allowed session that is Playing, (2) system current session if allowed,
/// (3) first allowed session from the full list (may be paused/stopped).
fn find_allowed_session(
    manager: &GlobalSystemMediaTransportControlsSessionManager,
) -> Option<GlobalSystemMediaTransportControlsSession> {
    let sessions: Vec<GlobalSystemMediaTransportControlsSession> =
        manager.GetSessions().ok()
            .map(|s| s.into_iter().collect())
            .unwrap_or_default();

    // 1. Prioriza qualquer sessão permitida que esteja tocando agora
    for session in &sessions {
        if let Ok(app_id) = session.SourceAppUserModelId() {
            if is_allowed_media_app(&app_id.to_string()) {
                if let Ok(playback_info) = session.GetPlaybackInfo() {
                    if let Ok(status) = playback_info.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            return Some(session.clone());
                        }
                    }
                }
            }
        }
    }

    // 2. Fallback: sessão "atual" do sistema, se for de um app permitido
    if let Ok(current_session) = manager.GetCurrentSession() {
        if let Ok(app_id) = current_session.SourceAppUserModelId() {
            if is_allowed_media_app(&app_id.to_string()) {
                return Some(current_session);
            }
        }
    }

    // 3. Fallback final: primeira sessão permitida da lista já obtida (pausada/parada)
    sessions.into_iter().find(|session| {
        session.SourceAppUserModelId()
            .map(|id| is_allowed_media_app(&id.to_string()))
            .unwrap_or(false)
    })
}

impl MediaInfo {
    pub async fn get_current() -> Option<MediaInfo> {
        let tx = ensure_worker();
        let (resp_tx, resp_rx) = oneshot::channel();
        if tx.send(MediaRequest::GetCurrent { response: resp_tx }).await.is_err() {
            log::error!("[media] Worker thread died");
            return None;
        }
        match resp_rx.await {
            Ok(info) => info,
            Err(_) => {
                log::error!("[media] Worker response channel closed");
                None
            }
        }
    }

    fn fetch_blocking() -> FetchOutcome {
        let manager = match get_session_manager() {
            Some(m) => m,
            None => {
                log::error!("[media] Could not get SMTC Session Manager");
                return FetchOutcome::ManagerUnavailable;
            }
        };

        let session = match find_allowed_session(&manager) {
            Some(s) => s,
            None => {
                log::debug!("[media] No active media session from allowed apps");
                return FetchOutcome::NoActiveSession;
            }
        };

        // Any transient failure inside (session closed mid-read, etc.)
        // is also treated as "no active session", not ManagerUnavailable.
        match build_media_info(&session) {
            Some(info) => FetchOutcome::Found(info),
            None => FetchOutcome::NoActiveSession,
        }
    }
}

/// Extracts data from an already-validated session.
/// Isolated into its own function to use `?` freely without
/// conflating ManagerUnavailable vs NoActiveSession.
fn build_media_info(session: &GlobalSystemMediaTransportControlsSession) -> Option<MediaInfo> {
    let app_name = session.SourceAppUserModelId().map(|id| id.to_string()).ok();

    let playback_info = session.GetPlaybackInfo().ok()?;
    let status = playback_info.PlaybackStatus().ok()?;
    let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

    let timeline = session.GetTimelineProperties().ok()?;
    let position_ticks = timeline.Position().ok()?.Duration;
    let last_updated_ticks = timeline.LastUpdatedTime().ok()?.UniversalTime;

    let current_time_ticks = {
        use std::time::SystemTime;
        let now = SystemTime::now();
        let duration = now.duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default();
        let file_time_secs = duration.as_secs() + 11_644_473_600;
        let file_time_100ns = file_time_secs * 10_000_000 + (duration.subsec_nanos() / 100) as u64;
        file_time_100ns as i64
    };

    let elapsed_ticks = if is_playing {
        (current_time_ticks - last_updated_ticks).max(0)
    } else {
        0
    };

    let duration_ticks = timeline.EndTime().ok()?.Duration;
    let total_position_ticks = (position_ticks + elapsed_ticks).min(duration_ticks).max(0);

    let position_seconds = total_position_ticks as f64 / 10_000_000.0;
    let duration_seconds = duration_ticks as f64 / 10_000_000.0;

    let props_op = session.TryGetMediaPropertiesAsync().ok()?;
    let props = wait_async(&props_op, OP_TIMEOUT_MEDIA_PROPS)?;

    let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
    let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();
    let album = props.AlbumTitle().map(|s| s.to_string()).unwrap_or_default();

    let mut thumbnail_url = None;
    let cache = get_cache();
    let mut cache_guard = cache.lock().unwrap();
    let cache_key = (title.clone(), artist.clone(), album.clone());

    if let Some(cached) = cache_guard.get(&cache_key) {
        if cached.fetched_at.elapsed() < CACHE_TTL {
            thumbnail_url = cached.data.clone();
        }
    }

    if thumbnail_url.is_none() && !title.is_empty() {
        if let Ok(stream_ref) = props.Thumbnail() {
            if let Ok(open_op) = stream_ref.OpenReadAsync() {
                if let Some(stream) = wait_async(&open_op, OP_TIMEOUT_STREAM_OPEN) {
                    let size = stream.Size().unwrap_or(0) as u32;
                    if size > 0 {
                        if let Ok(buffer) = Buffer::Create(size) {
                            if let Ok(read_op) = stream.ReadAsync(&buffer, size, InputStreamOptions::None) {
                                // ReadAsync returns IAsyncOperationWithProgress<IBuffer, u32>,
                                // not IAsyncOperation<T> — hence the separate function.
                                if wait_async_with_progress(&read_op, OP_TIMEOUT_STREAM_READ).is_some() {
                                    if let Ok(reader) = windows::Storage::Streams::DataReader::FromBuffer(&buffer) {
                                        let mut bytes = vec![0u8; size as usize];
                                        if reader.ReadBytes(&mut bytes).is_ok() {
                                            let content_type = stream.ContentType()
                                                .map(|s| s.to_string())
                                                .unwrap_or("image/png".to_string());
                                            let b64 = BASE64_STANDARD.encode(&bytes);
                                            let url = format!("data:{};base64,{}", content_type, b64);
                                            let cache_data = if url.len() <= MAX_THUMBNAIL_BYTES {
                                                thumbnail_url = Some(url.clone());
                                                Some(url)
                                            } else {
                                                thumbnail_url = Some(url);
                                                None
                                            };
                                            cache_guard.put(cache_key.clone(), CachedThumbnail {
                                                data: cache_data,
                                                fetched_at: std::time::Instant::now(),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if thumbnail_url.is_none() {
            cache_guard.put(cache_key, CachedThumbnail {
                data: None,
                fetched_at: std::time::Instant::now(),
            });
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

// ── Media Actions ─────────────────────────────────────────────────

#[derive(Debug, Deserialize, Clone, Copy)]
pub enum MediaAction {
    PlayPause,
    Next,
    Previous,
}

impl MediaAction {
    pub async fn execute(&self) -> Result<(), String> {
        let tx = ensure_worker();
        let (resp_tx, resp_rx) = oneshot::channel();
        tx.send(MediaRequest::ExecuteAction { action: *self, response: resp_tx }).await
            .map_err(|_| "Worker thread died".to_string())?;
        resp_rx.await.map_err(|_| "Worker response channel closed".to_string())?
    }

    fn execute_action_blocking(action: MediaAction) -> Result<(), String> {
        let manager = get_session_manager()
            .ok_or_else(|| "Could not get SMTC Session Manager".to_string())?;
        let session = find_allowed_session(&manager)
            .ok_or_else(|| "No active media session from allowed apps".to_string())?;

        let op = match action {
            MediaAction::PlayPause => session.TryTogglePlayPauseAsync(),
            MediaAction::Next => session.TrySkipNextAsync(),
            MediaAction::Previous => session.TrySkipPreviousAsync(),
        }
        .map_err(|e| e.to_string())?;

        match wait_async(&op, OP_TIMEOUT_ACTION) {
            Some(true) => Ok(()),
            Some(false) => Err("Action sent but rejected by the media session".to_string()),
            None => Err("Media action timed out (session may be hung)".to_string()),
        }
    }
}

// ── Seek ─────────────────────────────────────────────────────────

pub async fn media_seek(position_seconds: f64) -> Result<(), String> {
    let tx = ensure_worker();
    let (resp_tx, resp_rx) = oneshot::channel();
    tx.send(MediaRequest::Seek { position_seconds, response: resp_tx }).await
        .map_err(|_| "Worker thread died".to_string())?;
    resp_rx.await.map_err(|_| "Worker response channel closed".to_string())?
}

fn seek_blocking(position_seconds: f64) -> Result<(), String> {
    let manager = get_session_manager()
        .ok_or_else(|| "Could not get SMTC Session Manager".to_string())?;
    let session = find_allowed_session(&manager)
        .ok_or_else(|| "No active media session from allowed apps".to_string())?;
    let ticks = (position_seconds * 10_000_000.0) as i64;

    let op = session.TryChangePlaybackPositionAsync(ticks).map_err(|e| e.to_string())?;

    match wait_async(&op, OP_TIMEOUT_ACTION) {
        Some(true) => Ok(()),
        Some(false) => Err("Seek sent but rejected by the media session".to_string()),
        None => Err("Seek timed out (session may be hung)".to_string()),
    }
}