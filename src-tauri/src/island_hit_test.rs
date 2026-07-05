//! Keeps the click-through state of the island's overlay window(s) in sync
//! with where the mouse actually is.
//!
//! The island's Tauri window is always kept oversized (see `set_island_size`
//! in `lib.rs`) to avoid horizontal jitter while the pill morphs between
//! compact/preview/expanded modes. That means most of the window is empty,
//! transparent padding at any given time. Without this watcher the whole
//! (oversized) window would intercept every click within its bounds — even
//! over the transparent padding — blocking interaction with whatever
//! desktop content/app sits underneath.
//!
//! Instead of shaping the window with `SetWindowRgn` (which visually breaks
//! the layered/transparent window compositing, producing an opaque box), we
//! continuously compare the *global* cursor position against the on-screen
//! rectangle the visible pill currently occupies, and toggle
//! `set_ignore_cursor_events` accordingly. This only affects hit-testing —
//! never painting — so layout, animation and the drop-shadow are untouched.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewWindow};

/// Width of the corner-ear radial gradient (see IslandBackground.tsx:
/// the two `w-[12px]` absolute divs). The hit-test rect extends by this
/// amount on each side so clicks over the visible flare work.
const FLARE: f64 = 12.0;
/// Small buffer around the pill's own bounds so hovering near the very edge
/// still counts as "inside" (avoids flicker at the pixel-perfect boundary).
/// Kept intentionally tight — anything larger starts blocking clicks on
/// whatever sits right next to the island.
const MARGIN: f64 = 6.0;

#[derive(Clone, Copy, Debug)]
struct HitRect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

impl HitRect {
    fn contains(&self, px: i32, py: i32) -> bool {
        px >= self.x && px < self.x + self.width && py >= self.y && py < self.y + self.height
    }
}

/// Per-window bookkeeping, kept behind a single lock so each poll tick only
/// takes one uncontended `Mutex` and never allocates (no cloning of maps).
struct Entry {
    window: WebviewWindow,
    rect: HitRect,
    /// Last `ignore` value actually applied to the OS window, so we only
    /// call `set_ignore_cursor_events` when it needs to change.
    ignoring: bool,
    /// Cached parameters so we can re-compute the rect if the window moves
    /// (e.g. after a fullscreen game changes monitor resolution).
    window_width: f64,
    content_width: f64,
    content_height: f64,
}

#[derive(Default)]
pub struct HitRegionRegistry {
    entries: Mutex<HashMap<String, Entry>>,
}

impl HitRegionRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Records/updates the on-screen rectangle that should remain
    /// interactive for `window`, based on the *logical* size of the
    /// (oversized) window and the actual visible pill dimensions for the
    /// current island mode.
    pub fn update(
        &self,
        window: &WebviewWindow,
        window_width: f64,
        content_width: f64,
        content_height: f64,
    ) {
        let scale = match window.scale_factor() {
            Ok(s) => s,
            Err(_) => return,
        };
        let outer_pos = match window.outer_position() {
            Ok(p) => p,
            Err(_) => return,
        };

        // The visible pill is horizontally centered and top-aligned within
        // the (oversized) window — mirrors the `flex items-start
        // justify-center` wrapper + `left: -R` SVG offset in Island.tsx /
        // IslandBackground.tsx.
        let x_offset = (window_width - content_width) / 2.0;

        let y = outer_pos.y + ((-MARGIN * scale).round() as i32);
        let rect = HitRect {
            x: outer_pos.x + (((x_offset - FLARE - MARGIN) * scale).round() as i32),
            y: y.max(outer_pos.y),
            width: ((content_width + 2.0 * FLARE + 2.0 * MARGIN) * scale).round() as i32,
            height: ((content_height + 2.0 * MARGIN) * scale).round() as i32,
        };

        let mut entries = self.entries.lock().unwrap();
        entries
            .entry(window.label().to_string())
            .and_modify(|e| {
                e.rect = rect;
                e.window_width = window_width;
                e.content_width = content_width;
                e.content_height = content_height;
            })
            .or_insert_with(|| Entry {
                window: window.clone(),
                rect,
                ignoring: false,
                window_width,
                content_width,
                content_height,
            });
    }

    /// Single `GetCursorPos` syscall + in-place rectangle checks. No heap
    /// allocation, no cloning, one lock acquisition.
    /// Every ~30th call also re-reads the window's on-screen position so the
    /// hit rect stays accurate after monitor resolution changes (fullscreen
    /// games, display reconfig, etc.).
    fn tick(&self, tick_count: u32) {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

        let mut point = POINT::default();
        if unsafe { GetCursorPos(&mut point) }.is_err() {
            return;
        }

        let refresh = tick_count % 30 == 0;

        let mut entries = self.entries.lock().unwrap();
        for entry in entries.values_mut() {
            if refresh {
                if let Ok(scale) = entry.window.scale_factor() {
                    if let Ok(outer_pos) = entry.window.outer_position() {
                        let x_offset = (entry.window_width - entry.content_width) / 2.0;
                        let y = outer_pos.y + ((-MARGIN * scale).round() as i32);
                        entry.rect = HitRect {
                            x: outer_pos.x + (((x_offset - FLARE - MARGIN) * scale).round() as i32),
                            y: y.max(outer_pos.y),
                            width: ((entry.content_width + 2.0 * FLARE + 2.0 * MARGIN) * scale).round() as i32,
                            height: ((entry.content_height + 2.0 * MARGIN) * scale).round() as i32,
                        };
                    }
                }
            }

            let should_ignore = !entry.rect.contains(point.x, point.y);
            if entry.ignoring != should_ignore {
                if entry.window.set_ignore_cursor_events(should_ignore).is_ok() {
                    entry.ignoring = should_ignore;
                }
            }
        }
    }
}

/// Spawns the background task that keeps click-through state in sync with
/// the cursor position. Cheap: a single `GetCursorPos` call plus a few
/// rectangle comparisons every 30ms.
pub fn spawn_watcher(app_handle: AppHandle, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    tauri::async_runtime::spawn(async move {
        log::info!("[hit_test] Iniciando watcher de click-through");
        let registry = app_handle
            .state::<std::sync::Arc<HitRegionRegistry>>()
            .inner()
            .clone();
        let mut tick_count: u32 = 0;
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    log::info!("[hit_test] Parando watcher de click-through");
                    break;
                }
                _ = tokio::time::sleep(Duration::from_millis(30)) => {
                    registry.tick(tick_count);
                    tick_count = tick_count.wrapping_add(1);
                }
            }
        }
    });
}
