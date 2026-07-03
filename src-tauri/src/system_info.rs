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

#[derive(Copy, Clone, PartialEq, Debug)]
pub enum CpuTempMethod {
    Unknown,
    Sysinfo,
    LibreHardwareMonitor,
    OpenHardwareMonitor,
    Acpi,
    None,
}

/// Thread-safe wrapper around `sysinfo::System`.
pub struct SystemMonitor {
    system: Mutex<System>,
    cpu_name: String,
    gpu_name: Mutex<String>,
    gpu_backend: Mutex<GpuBackend>,
    cpu_temp_method: Mutex<CpuTempMethod>,
    last_temp_detection: Mutex<std::time::Instant>,
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

        let gpu_name = Mutex::new("Graphics Card".to_string());
        let gpu_backend = Mutex::new(GpuBackend::None);
        let cpu_temp_method = Mutex::new(CpuTempMethod::Unknown);
        let last_temp_detection = Mutex::new(std::time::Instant::now());

        #[cfg(target_os = "windows")]
        let last_global_cpu_times = Mutex::new(get_win32_global_cpu_times());

        Self {
            system: Mutex::new(sys),
            cpu_name,
            gpu_name,
            gpu_backend,
            cpu_temp_method,
            last_temp_detection,
            #[cfg(target_os = "windows")]
            last_global_cpu_times,
        }
    }

    #[cfg(target_os = "windows")]
    pub fn detect_gpu_name(&self) {
        let gpu = run_command("powershell", &[
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"
        ]).unwrap_or_else(|| "Graphics Card".to_string());

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

        // Query CPU and GPU temperatures using sysinfo::Components
        use sysinfo::Components;
        let components = Components::new_with_refreshed_list();
        
        let mut cpu_temp = components.iter()
            .find(|c| {
                let label = c.label().to_lowercase();
                label.contains("cpu") || label.contains("core") || label.contains("package") || label.contains("soc")
            })
            .and_then(|c| c.temperature())
            .or_else(|| {
                components.iter().find_map(|c| c.temperature())
            });

        if cpu_temp.is_some() {
            if let Ok(mut method) = self.cpu_temp_method.lock() {
                *method = CpuTempMethod::Sysinfo;
            }
        }

        #[cfg(target_os = "windows")]
        if cpu_temp.is_none() {
            let mut method_lock = self.cpu_temp_method.lock().unwrap();
            let mut last_det_lock = self.last_temp_detection.lock().unwrap();
            let now = std::time::Instant::now();
            
            let should_detect = match *method_lock {
                CpuTempMethod::Unknown => true,
                CpuTempMethod::None => now.duration_since(*last_det_lock) > std::time::Duration::from_secs(30),
                _ => false,
            };
            
            if should_detect {
                // Try LibreHardwareMonitor
                let lhm_val = run_command("powershell", &[
                    "-Command",
                    "(Get-CimInstance -Namespace root/LibreHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -and ($_.Name -like '*CPU Core*' -or $_.Name -like '*CPU Package*') } | Select-Object -ExpandProperty Value -First 1)"
                ])
                .and_then(|out| out.replace(',', ".").parse::<f32>().ok());
                
                if lhm_val.is_some() {
                    *method_lock = CpuTempMethod::LibreHardwareMonitor;
                    cpu_temp = lhm_val;
                } else {
                    // Try OpenHardwareMonitor
                    let ohm_val = run_command("powershell", &[
                        "-Command",
                        "(Get-CimInstance -Namespace root/OpenHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -and ($_.Name -like '*CPU Core*' -or $_.Name -like '*CPU Package*') } | Select-Object -ExpandProperty Value -First 1)"
                    ])
                    .and_then(|out| out.replace(',', ".").parse::<f32>().ok());
                    
                    if ohm_val.is_some() {
                        *method_lock = CpuTempMethod::OpenHardwareMonitor;
                        cpu_temp = ohm_val;
                    } else {
                        // Try ACPI
                        let acpi_val = run_command("powershell", &[
                            "-Command",
                            "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature).CurrentTemperature"
                        ])
                        .and_then(|out| out.replace(',', ".").parse::<f32>().ok())
                        .map(|k_tenths| k_tenths / 10.0 - 273.15);
                        
                        if acpi_val.is_some() {
                            *method_lock = CpuTempMethod::Acpi;
                            cpu_temp = acpi_val;
                        } else {
                            *method_lock = CpuTempMethod::None;
                            *last_det_lock = now;
                        }
                    }
                }
            } else {
                match *method_lock {
                    CpuTempMethod::LibreHardwareMonitor => {
                        let val = run_command("powershell", &[
                            "-Command",
                            "(Get-CimInstance -Namespace root/LibreHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -and ($_.Name -like '*CPU Core*' -or $_.Name -like '*CPU Package*') } | Select-Object -ExpandProperty Value -First 1)"
                        ])
                        .and_then(|out| out.replace(',', ".").parse::<f32>().ok());
                        
                        if val.is_some() {
                            cpu_temp = val;
                        } else {
                            *method_lock = CpuTempMethod::None;
                            *last_det_lock = now;
                        }
                    }
                    CpuTempMethod::OpenHardwareMonitor => {
                        let val = run_command("powershell", &[
                            "-Command",
                            "(Get-CimInstance -Namespace root/OpenHardwareMonitor -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -and ($_.Name -like '*CPU Core*' -or $_.Name -like '*CPU Package*') } | Select-Object -ExpandProperty Value -First 1)"
                        ])
                        .and_then(|out| out.replace(',', ".").parse::<f32>().ok());
                        
                        if val.is_some() {
                            cpu_temp = val;
                        } else {
                            *method_lock = CpuTempMethod::None;
                            *last_det_lock = now;
                        }
                    }
                    CpuTempMethod::Acpi => {
                        let val = run_command("powershell", &[
                            "-Command",
                            "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature).CurrentTemperature"
                        ])
                        .and_then(|out| out.replace(',', ".").parse::<f32>().ok())
                        .map(|k_tenths| k_tenths / 10.0 - 273.15);
                        
                        if val.is_some() {
                            cpu_temp = val;
                        } else {
                            *method_lock = CpuTempMethod::None;
                            *last_det_lock = now;
                        }
                    }
                    _ => {}
                }
            }
        }

        let gpu_temp = components.iter()
            .find(|c| c.label().to_lowercase().contains("gpu"))
            .and_then(|c| c.temperature())
            .or_else(|| self.query_gpu_temp_via_smi());

        SystemStats {
            cpu_name: self.cpu_name.clone(),
            cpu_usage,
            total_memory,
            used_memory,
            memory_percent,
            gpu_name: self.gpu_name.lock().unwrap().clone(),
            gpu_usage,
            disks: disk_stats,
            cpu_temp,
            gpu_temp,
        }
    }

    /// Query GPU utilisation using the detected backend.
    fn query_gpu_usage(&self) -> f32 {
        match *self.gpu_backend.lock().unwrap() {
            GpuBackend::NvidiaSmi => {
                run_command("nvidia-smi", &[
                    "--query-gpu=utilization.gpu",
                    "--format=csv,noheader,nounits"
                ])
                .and_then(|s| s.replace(',', ".").parse::<f32>().ok())
                .unwrap_or(0.0)
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
                    .unwrap_or_else(Self::query_gpu_usage_via_wmi)
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
                    .unwrap_or_else(Self::query_gpu_usage_via_wmi)
            }
            GpuBackend::WindowsWmi => Self::query_gpu_usage_via_wmi(),
            GpuBackend::None => 0.0,
        }
    }

    /// Universal fallback: query GPU utilisation via Windows WMI performance counters.
    #[cfg(target_os = "windows")]
    fn query_gpu_usage_via_wmi() -> f32 {
        run_command("powershell", &[
            "-Command",
            "$v = Get-CimInstance -ClassName Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.EngType -eq '3D' } | Select-Object -ExpandProperty PercentGPUTime; if ($v) { ($v | Measure-Object -Average).Average } else { 0 }"
        ])
        .and_then(|s| s.replace(',', ".").parse::<f32>().ok())
        .unwrap_or(0.0)
    }

    #[cfg(not(target_os = "windows"))]
    fn query_gpu_usage_via_wmi() -> f32 { 0.0 }

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

