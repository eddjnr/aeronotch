use serde::Serialize;
use std::sync::Mutex;
use sysinfo::System;

/// Real-time system statistics emitted to the frontend.
#[derive(Debug, Serialize, Clone)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub memory_percent: f32,
}

/// Thread-safe wrapper around `sysinfo::System`.
/// Held as managed state so every command / background task
/// shares a single instance.
pub struct SystemMonitor {
    system: Mutex<System>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            system: Mutex::new(sys),
        }
    }

    /// Refresh CPU + memory counters and return a snapshot.
    pub fn get_stats(&self) -> SystemStats {
        let mut sys = self.system.lock().unwrap();
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let total_memory = sys.total_memory();
        let used_memory = sys.used_memory();
        let memory_percent = if total_memory > 0 {
            (used_memory as f32 / total_memory as f32) * 100.0
        } else {
            0.0
        };

        SystemStats {
            cpu_usage: sys.global_cpu_usage(),
            total_memory,
            used_memory,
            memory_percent,
        }
    }
}
