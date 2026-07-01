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
    pub gpu_name: String,
    pub gpu_usage: f32,
    pub disk_name: String,
    pub disk_total: u64,
    pub disk_used: u64,
    pub disk_percent: f32,
}

/// Helper to execute process commands without displaying console window
fn run_command(cmd: &str, args: &[&str]) -> Option<String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    
    let mut command = Command::new(cmd);
    command.args(args);
    
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    
    let output = command.output().ok()?;
    if output.status.success() {
        String::from_utf8(output.stdout).ok().map(|s| s.trim().to_string())
    } else {
        None
    }
}

/// Thread-safe wrapper around `sysinfo::System`.
pub struct SystemMonitor {
    system: Mutex<System>,
    gpu_name: String,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();

        // Get GPU name once at startup
        let gpu_name = run_command("powershell", &[
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"
        ]).unwrap_or_else(|| "NVIDIA Graphics".to_string());

        Self {
            system: Mutex::new(sys),
            gpu_name,
        }
    }

    /// Refresh CPU, memory, GPU and disk counters and return a snapshot.
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

        // Query GPU usage via nvidia-smi if available
        let gpu_usage = run_command("nvidia-smi", &[
            "--query-gpu=utilization.gpu",
            "--format=csv,noheader,nounits"
        ])
        .and_then(|s| s.parse::<f32>().ok())
        .unwrap_or(0.0);

        // Query disk space using sysinfo
        use sysinfo::Disks;
        let disks = Disks::new_with_refreshed_list();
        
        let mut disk_name = "C:\\".to_string();
        let mut disk_total = 0;
        let mut disk_used = 0;
        let mut disk_percent = 0.0;
        
        if let Some(main_disk) = disks.iter().find(|d| {
            d.mount_point().to_string_lossy().contains("C:") || d.mount_point().to_string_lossy() == "/"
        }).or_else(|| disks.iter().next()) {
            disk_name = main_disk.mount_point().to_string_lossy().to_string();
            disk_total = main_disk.total_space();
            let available = main_disk.available_space();
            disk_used = if disk_total >= available { disk_total - available } else { 0 };
            disk_percent = if disk_total > 0 {
                (disk_used as f32 / disk_total as f32) * 100.0
            } else {
                0.0
            };
        }

        SystemStats {
            cpu_usage: sys.global_cpu_usage(),
            total_memory,
            used_memory,
            memory_percent,
            gpu_name: self.gpu_name.clone(),
            gpu_usage,
            disk_name,
            disk_total,
            disk_used,
            disk_percent,
        }
    }
}

