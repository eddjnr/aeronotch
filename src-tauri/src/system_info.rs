use serde::Serialize;
use std::sync::{Arc, Mutex};
use sysinfo::{Components, Disks, System};

use crate::wmi_metrics::CachedWmiStats;

#[derive(Debug, Serialize, Clone)]
pub struct DiskStats {
    pub name: String,
    pub total: u64,
    pub used: u64,
    pub percent: f32,
}

/// Which tool/provider to use for querying GPU metrics.
#[derive(Debug, Clone, Copy, PartialEq)]
enum GpuBackend {
    None,
    NvidiaSmi,
    AmdRocmSmi,
    IntelXpuSmi,
    WindowsWmi,
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
    pub cpu_temp: Option<f32>,
    pub gpu_temp: Option<f32>,
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
    disks: Mutex<Disks>,
    components: Mutex<Components>,
    cpu_name: String,
    gpu_name: Mutex<String>,
    gpu_backend: Mutex<GpuBackend>,
    wmi_stats: Option<Arc<Mutex<CachedWmiStats>>>,
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
    pub fn new(wmi_stats: Option<Arc<Mutex<CachedWmiStats>>>) -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();

        // Get CPU name once at startup
        let cpu_name = sys.cpus().first()
            .map(|c| c.brand().trim().to_string())
            .unwrap_or_else(|| "Processor".to_string());

        let gpu_name = Mutex::new("Graphics Card".to_string());
        let gpu_backend = Mutex::new(GpuBackend::None);

        // Pre-allocate Disks and Components once, refresh in get_stats
        let disks = Mutex::new(Disks::new_with_refreshed_list());
        let components = Mutex::new(Components::new_with_refreshed_list());

        #[cfg(target_os = "windows")]
        let last_global_cpu_times = Mutex::new(get_win32_global_cpu_times());

        Self {
            system: Mutex::new(sys),
            disks,
            components,
            cpu_name,
            gpu_name,
            gpu_backend,
            wmi_stats,
            #[cfg(target_os = "windows")]
            last_global_cpu_times,
        }
    }

    #[cfg(target_os = "windows")]
    pub fn detect_gpu_name(&self) {
        // Prefer WMI cache (populated by worker thread), fall back to PowerShell
        let gpu = self.wmi_stats.as_ref()
            .and_then(|s| s.lock().ok())
            .and_then(|s| {
                if s.gpu_name_ready && !s.gpu_name.is_empty() {
                    Some(s.gpu_name.clone())
                } else {
                    None
                }
            })
            .or_else(|| {
                run_command("powershell", &[
                    "-Command",
                    "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"
                ])
            })
            .unwrap_or_else(|| "Graphics Card".to_string());

        if let Ok(mut name) = self.gpu_name.lock() {
            *name = gpu;
        }

        self.detect_gpu_backend();
    }

    #[cfg(not(target_os = "windows"))]
    pub fn detect_gpu_name(&self) {}

    /// Detect which GPU backend is available based on vendor + installed tools.
    fn detect_gpu_backend(&self) {
        let gpu_name = self.gpu_name.lock().unwrap().clone().to_lowercase();

        let backend = if gpu_name.contains("nvidia") {
            if run_command("nvidia-smi", &["--help"]).is_some() {
                GpuBackend::NvidiaSmi
            } else {
                GpuBackend::WindowsWmi
            }
        } else if gpu_name.contains("amd") || gpu_name.contains("radeon") || gpu_name.contains("advanced micro devices") {
            if run_command("rocm-smi", &["--showuse"]).is_some() {
                GpuBackend::AmdRocmSmi
            } else {
                GpuBackend::WindowsWmi
            }
        } else if gpu_name.contains("intel") {
            if run_command("xpu-smi", &["--help"]).is_some() {
                GpuBackend::IntelXpuSmi
            } else {
                GpuBackend::WindowsWmi
            }
        } else {
            GpuBackend::WindowsWmi
        };

        if let Ok(mut b) = self.gpu_backend.lock() {
            *b = backend;
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

        let gpu_usage = self.query_gpu_usage();

        // Refresh and query disk space
        let mut disks = self.disks.lock().unwrap();
        disks.refresh(true);
        
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

        // Read a snapshot from the WMI cache (no PowerShell involved)
        let wmi_snapshot = self.wmi_stats.as_ref()
            .and_then(|s| s.lock().ok())
            .map(|s| s.clone());

        // Refresh and query temperatures, fall back to WMI cache
        let mut components = self.components.lock().unwrap();
        components.refresh(true);

        let cpu_temp = components.iter()
            .find(|c| {
                let label = c.label().to_lowercase();
                label.contains("cpu") || label.contains("core") || label.contains("package") || label.contains("soc")
            })
            .and_then(|c| c.temperature())
            .or_else(|| components.iter().find_map(|c| c.temperature()))
            .or_else(|| {
                wmi_snapshot.as_ref().and_then(|w| w.cpu_temp_celsius)
            });

        let gpu_temp = components.iter()
            .find(|c| c.label().to_lowercase().contains("gpu"))
            .and_then(|c| c.temperature())
            .or_else(|| self.query_gpu_temp_via_smi());

        let gpu_name = wmi_snapshot.as_ref()
            .and_then(|w| {
                if !w.gpu_name.is_empty() { Some(w.gpu_name.clone()) } else { None }
            })
            .unwrap_or_else(|| self.gpu_name.lock().unwrap().clone());

        SystemStats {
            cpu_name: self.cpu_name.clone(),
            cpu_usage,
            total_memory,
            used_memory,
            memory_percent,
            gpu_name,
            gpu_usage,
            disks: disk_stats,
            cpu_temp,
            gpu_temp,
        }
    }

    /// Query GPU utilisation using the detected backend.
    fn query_gpu_usage(&self) -> f32 {
        // For non-WMI backends, we may also want the WMI cache as fallback
        let wmi_fallback = || -> f32 {
            self.wmi_stats.as_ref()
                .and_then(|s| s.lock().ok())
                .map(|s| s.gpu_usage_pct)
                .unwrap_or(0.0)
        };

        match *self.gpu_backend.lock().unwrap() {
            GpuBackend::NvidiaSmi => {
                run_command("nvidia-smi", &[
                    "--query-gpu=utilization.gpu",
                    "--format=csv,noheader,nounits"
                ])
                .and_then(|s| s.replace(',', ".").parse::<f32>().ok())
                .unwrap_or_else(wmi_fallback)
            }
            GpuBackend::AmdRocmSmi => {
                run_command("rocm-smi", &["--showuse"])
                    .and_then(|s| {
                        let nums: Vec<f32> = s.lines()
                            .flat_map(|l| {
                                l.split(|c: char| !c.is_ascii_digit() && c != '.')
                                    .filter_map(|n| n.parse::<f32>().ok())
                            })
                            .collect();
                        nums.into_iter().reduce(f32::max)
                    })
                    .unwrap_or_else(wmi_fallback)
            }
            GpuBackend::IntelXpuSmi => {
                run_command("xpu-smi", &["dump", "-d", "0", "-g", "0", "-m", "utilization"])
                    .and_then(|s| {
                        let nums: Vec<f32> = s.lines()
                            .flat_map(|l| {
                                l.split(|c: char| !c.is_ascii_digit() && c != '.')
                                    .filter_map(|n| n.parse::<f32>().ok())
                            })
                            .collect();
                        nums.into_iter().reduce(f32::max)
                    })
                    .unwrap_or_else(wmi_fallback)
            }
            GpuBackend::WindowsWmi => wmi_fallback(),
            GpuBackend::None => 0.0,
        }
    }

    /// Query GPU temperature via the detected SMI backend as fallback.
    fn query_gpu_temp_via_smi(&self) -> Option<f32> {
        match *self.gpu_backend.lock().unwrap() {
            GpuBackend::NvidiaSmi => {
                run_command("nvidia-smi", &[
                    "--query-gpu=temperature.gpu",
                    "--format=csv,noheader,nounits"
                ])
                .and_then(|out| out.replace(',', ".").parse::<f32>().ok())
            }
            GpuBackend::AmdRocmSmi => {
                run_command("rocm-smi", &["--showtemp"])
                    .and_then(|s| {
                        let nums: Vec<f32> = s.lines()
                            .flat_map(|l| {
                                l.split(|c: char| !c.is_ascii_digit() && c != '.')
                                    .filter_map(|n| n.parse::<f32>().ok())
                            })
                            .collect();
                        nums.into_iter().reduce(f32::max)
                    })
            }
            GpuBackend::IntelXpuSmi => {
                run_command("xpu-smi", &["dump", "-d", "0", "-g", "0", "-m", "temperature"])
                    .and_then(|s| {
                        let nums: Vec<f32> = s.lines()
                            .flat_map(|l| {
                                l.split(|c: char| !c.is_ascii_digit() && c != '.')
                                    .filter_map(|n| n.parse::<f32>().ok())
                            })
                            .collect();
                        nums.into_iter().reduce(f32::max)
                    })
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disk_stats_calculation() {
        let stats = DiskStats {
            name: "C:\\".to_string(),
            total: 500_000_000_000,
            used: 300_000_000_000,
            percent: 60.0,
        };
        assert_eq!(stats.name, "C:\\");
        assert_eq!(stats.total, 500_000_000_000);
        assert_eq!(stats.used, 300_000_000_000);
        assert!((stats.percent - 60.0).abs() < 0.01);
    }

    #[test]
    fn test_disk_stats_empty_total() {
        let stats = DiskStats {
            name: "D:\\".to_string(),
            total: 0,
            used: 0,
            percent: 0.0,
        };
        assert_eq!(stats.percent, 0.0);
    }

    #[test]
    fn test_system_stats_default_gpu() {
        let stats = SystemStats {
            cpu_name: "Test CPU".to_string(),
            cpu_usage: 42.0,
            total_memory: 16_000_000_000,
            used_memory: 8_000_000_000,
            memory_percent: 50.0,
            gpu_name: "Graphics Card".to_string(),
            gpu_usage: 0.0,
            disks: vec![],
            cpu_temp: None,
            gpu_temp: None,
        };
        assert_eq!(stats.cpu_name, "Test CPU");
        assert_eq!(stats.memory_percent, 50.0);
        assert_eq!(stats.gpu_name, "Graphics Card");
        assert!(stats.cpu_temp.is_none());
    }

    #[test]
    fn test_memory_percent_calculation() {
        let total: u64 = 16_000_000_000;
        let used: u64 = 8_000_000_000;
        let percent = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };
        assert!((percent - 50.0).abs() < 0.01);

        let total_zero = 0u64;
        let percent_zero = if total_zero > 0 {
            (used as f32 / total_zero as f32) * 100.0
        } else {
            0.0
        };
        assert_eq!(percent_zero, 0.0);
    }
}

