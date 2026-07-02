use serde::Serialize;
use std::sync::Mutex;
use sysinfo::System;

#[derive(Debug, Serialize, Clone)]
pub struct DiskStats {
    pub name: String,
    pub total: u64,
    pub used: u64,
    pub percent: f32,
}

/// Real-time system statistics emitted to the frontend.
#[derive(Debug, Serialize, Clone)]
pub struct SystemStats {
    pub cpu_name: String,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub memory_percent: f32,
    pub gpu_name: String,
    pub gpu_usage: f32,
    pub disks: Vec<DiskStats>,
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
    cpu_name: String,
    gpu_name: String,
    #[cfg(target_os = "windows")]
    last_global_cpu_times: Mutex<Option<(u64, u64)>>,
}

#[cfg(target_os = "windows")]
#[repr(C)]
#[derive(Default, Copy, Clone, Debug)]
pub struct FILETIME {
    pub dw_low_date_time: u32,
    pub dw_high_date_time: u32,
}

#[cfg(target_os = "windows")]
extern "system" {
    fn GetSystemTimes(
        lp_idle_time: *mut FILETIME,
        lp_kernel_time: *mut FILETIME,
        lp_user_time: *mut FILETIME,
    ) -> i32;
}

#[cfg(target_os = "windows")]
fn get_win32_global_cpu_times() -> Option<(u64, u64)> {
    let mut idle = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();

    let result = unsafe {
        GetSystemTimes(&mut idle, &mut kernel, &mut user)
    };

    if result == 0 {
        return None;
    }

    let idle_val = ((idle.dw_high_date_time as u64) << 32) | (idle.dw_low_date_time as u64);
    let kernel_val = ((kernel.dw_high_date_time as u64) << 32) | (kernel.dw_low_date_time as u64);
    let user_val = ((user.dw_high_date_time as u64) << 32) | (user.dw_low_date_time as u64);

    let total = kernel_val + user_val;
    Some((idle_val, total))
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();

        // Get CPU name once at startup
        let cpu_name = sys.cpus().first()
            .map(|c| c.brand().trim().to_string())
            .unwrap_or_else(|| "Processor".to_string());

        // Get GPU name once at startup
        let gpu_name = run_command("powershell", &[
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"
        ]).unwrap_or_else(|| "NVIDIA Graphics".to_string());

        #[cfg(target_os = "windows")]
        let last_global_cpu_times = Mutex::new(get_win32_global_cpu_times());

        Self {
            system: Mutex::new(sys),
            cpu_name,
            gpu_name,
            #[cfg(target_os = "windows")]
            last_global_cpu_times,
        }
    }

    /// Refresh CPU, memory, GPU and disk counters and return a snapshot.
    pub fn get_stats(&self) -> SystemStats {
        let mut sys = self.system.lock().unwrap();
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
        
        let mut disk_stats = Vec::new();
        for disk in disks.iter() {
            let name = disk.mount_point().to_string_lossy().to_string();
            let total = disk.total_space();
            let available = disk.available_space();
            let used = if total >= available { total - available } else { 0 };
            let percent = if total > 0 {
                (used as f32 / total as f32) * 100.0
            } else {
                0.0
            };
            disk_stats.push(DiskStats {
                name,
                total,
                used,
                percent,
            });
        }

        if disk_stats.is_empty() {
            disk_stats.push(DiskStats {
                name: "C:\\".to_string(),
                total: 0,
                used: 0,
                percent: 0.0,
            });
        }

        #[cfg(target_os = "windows")]
        let cpu_usage = {
            let mut usage = 0.0;
            if let Some((curr_idle, curr_total)) = get_win32_global_cpu_times() {
                if let Ok(mut last_times) = self.last_global_cpu_times.lock() {
                    if let Some((prev_idle, prev_total)) = *last_times {
                        let idle_diff = curr_idle.saturating_sub(prev_idle);
                        let total_diff = curr_total.saturating_sub(prev_total);
                        if total_diff > 0 {
                            usage = (100.0 - (idle_diff as f64 * 100.0 / total_diff as f64)) as f32;
                            if usage < 0.0 { usage = 0.0; }
                            if usage > 100.0 { usage = 100.0; }
                        }
                    }
                    *last_times = Some((curr_idle, curr_total));
                }
            }
            usage
        };

        #[cfg(not(target_os = "windows"))]
        let cpu_usage = {
            sys.refresh_cpu_usage();
            sys.global_cpu_usage()
        };

        SystemStats {
            cpu_name: self.cpu_name.clone(),
            cpu_usage,
            total_memory,
            used_memory,
            memory_percent,
            gpu_name: self.gpu_name.clone(),
            gpu_usage,
            disks: disk_stats,
        }
    }
}
