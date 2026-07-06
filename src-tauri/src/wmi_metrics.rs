use std::collections::HashMap;
use std::panic;
use std::sync::{Arc, Mutex};
use wmi::{COMLibrary, Variant, WMIConnection};

/// Thread-safe snapshot of WMI-polled metrics, updated by a dedicated worker thread.
#[derive(Debug, Clone)]
pub struct CachedWmiStats {
    pub gpu_name: String,
    pub gpu_usage_pct: f32,
    pub cpu_temp_celsius: Option<f32>,
    pub gpu_name_ready: bool,
}

impl Default for CachedWmiStats {
    fn default() -> Self {
        Self {
            gpu_name: String::new(),
            gpu_usage_pct: 0.0,
            cpu_temp_celsius: None,
            gpu_name_ready: false,
        }
    }
}

/// Spawns a dedicated OS thread that owns persistent WMI COM connections.
pub fn spawn_worker(shutdown_rx: tokio::sync::broadcast::Receiver<()>) -> Arc<Mutex<CachedWmiStats>> {
    let stats = Arc::new(Mutex::new(CachedWmiStats::default()));
    let thread_stats = stats.clone();
    std::thread::spawn(move || {
        if let Err(e) = panic::catch_unwind(panic::AssertUnwindSafe(|| {
            worker_loop(thread_stats, shutdown_rx);
        })) {
            log::error!("WMI worker panicked: {e:?}");
        }
    });
    stats
}

fn extract_string(val: &Variant) -> Option<String> {
    match val {
        Variant::String(s) => Some(s.clone()),
        _ => None,
    }
}

fn extract_f32(val: &Variant) -> Option<f32> {
    match val {
        Variant::R4(f) => Some(*f),
        Variant::R8(f) => Some(*f as f32),
        Variant::I4(n) => Some(*n as f32),
        Variant::I8(n) => Some(*n as f32),
        Variant::UI4(n) => Some(*n as f32),
        Variant::UI8(n) => Some(*n as f32),
        Variant::String(s) => s.replace(',', ".").parse::<f32>().ok(),
        _ => None,
    }
}

fn worker_loop(stats: Arc<Mutex<CachedWmiStats>>, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    let com = match COMLibrary::new() {
        Ok(c) => c,
        Err(e) => {
            log::error!("WMI worker: COMLibrary::new() failed: {e:?}");
            return;
        }
    };

    let cimv2 = match WMIConnection::new(com) {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("WMI worker: WMIConnection::new() failed: {e:?}");
            return;
        }
    };

    // GPU name – query once at startup; only mark ready if we got a real name
    if let Some(gpu_name) = query_gpu_name(&cimv2) {
        if let Ok(mut s) = stats.lock() {
            s.gpu_name = gpu_name;
            s.gpu_name_ready = true;
        }
    }

    // Namespace connections for CPU temperature (COMLibrary is Copy)
    let lhm = WMIConnection::with_namespace_path("ROOT\\LibreHardwareMonitor", com).ok();
    let ohm = WMIConnection::with_namespace_path("ROOT\\OpenHardwareMonitor", com).ok();
    let acpi = WMIConnection::with_namespace_path("ROOT\\wmi", com).ok();

    log::info!(
        "WMI worker: LHM={} OHM={} ACPI={}",
        lhm.is_some(),
        ohm.is_some(),
        acpi.is_some()
    );

    enum Source {
        Lhm,
        Ohm,
        Acpi,
        None,
    }

    let mut temp_src = Source::None;
    let mut next_retry = std::time::Instant::now();
    let mut temp_consecutive_failures = 0u32;

    loop {
        if shutdown_rx.try_recv().is_ok() {
            log::info!("WMI worker shutting down");
            break;
        }

        let gpu_usage = query_gpu_usage(&cimv2);
        if let Ok(mut s) = stats.lock() {
            s.gpu_usage_pct = gpu_usage;
        }

        let now = std::time::Instant::now();

        match temp_src {
            Source::Lhm => {
                let got = lhm.as_ref().and_then(|c| query_sensor_temp(c));
                match got {
                    Some(temp) => {
                        temp_consecutive_failures = 0;
                        if let Ok(mut s) = stats.lock() {
                            s.cpu_temp_celsius = Some(temp);
                        }
                    }
                    None => {
                        temp_consecutive_failures += 1;
                        if temp_consecutive_failures >= 3 {
                            log::warn!("WMI worker: LHM failed 3x, re-probing all sources");
                            temp_src = Source::None;
                            next_retry = now;
                        }
                    }
                }
            }
            Source::Ohm => {
                let got = ohm.as_ref().and_then(|c| query_sensor_temp(c));
                match got {
                    Some(temp) => {
                        temp_consecutive_failures = 0;
                        if let Ok(mut s) = stats.lock() {
                            s.cpu_temp_celsius = Some(temp);
                        }
                    }
                    None => {
                        temp_consecutive_failures += 1;
                        if temp_consecutive_failures >= 3 {
                            log::warn!("WMI worker: OHM failed 3x, re-probing all sources");
                            temp_src = Source::None;
                            next_retry = now;
                        }
                    }
                }
            }
            Source::Acpi => {
                let got = acpi.as_ref().and_then(|c| query_acpi_temp(c));
                match got {
                    Some(temp) => {
                        temp_consecutive_failures = 0;
                        if let Ok(mut s) = stats.lock() {
                            s.cpu_temp_celsius = Some(temp);
                        }
                    }
                    None => {
                        temp_consecutive_failures += 1;
                        if temp_consecutive_failures >= 3 {
                            log::warn!("WMI worker: ACPI failed 3x, re-probing all sources");
                            temp_src = Source::None;
                            next_retry = now;
                        }
                    }
                }
            }
            Source::None if now >= next_retry => {
                let found: Option<(Source, f32)> = lhm
                    .as_ref()
                    .and_then(|c| query_sensor_temp(c).map(|t| (Source::Lhm, t)))
                    .or_else(|| {
                        ohm.as_ref()
                            .and_then(|c| query_sensor_temp(c).map(|t| (Source::Ohm, t)))
                    })
                    .or_else(|| {
                        acpi.as_ref()
                            .and_then(|c| query_acpi_temp(c).map(|t| (Source::Acpi, t)))
                    });

                if let Some((src, temp)) = found {
                    temp_src = src;
                    temp_consecutive_failures = 0;
                    if let Ok(mut s) = stats.lock() {
                        s.cpu_temp_celsius = Some(temp);
                    }
                } else {
                    temp_src = Source::None;
                }
                next_retry = now + std::time::Duration::from_secs(30);
            }
            _ => {}
        }

        std::thread::sleep(std::time::Duration::from_secs(3));
    }
}

fn query_gpu_name(conn: &WMIConnection) -> Option<String> {
    let results: Vec<HashMap<String, Variant>> = conn
        .raw_query("SELECT Name FROM Win32_VideoController")
        .ok()?;
    results
        .into_iter()
        .next()
        .and_then(|mut map| map.remove("Name"))
        .and_then(|v| extract_string(&v))
}

fn query_gpu_usage(conn: &WMIConnection) -> f32 {
    let results: Vec<HashMap<String, Variant>> = match conn.raw_query(
        "SELECT PercentGPUTime, EngType FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine",
    ) {
        Ok(r) => r,
        Err(_) => return 0.0,
    };

    let mut total = 0.0f32;
    let mut count = 0u32;

    for mut row in results {
        let eng_type = row.remove("EngType").and_then(|v| extract_string(&v));
        if eng_type.as_deref() != Some("3D") {
            continue;
        }

        if let Some(val) = row.remove("PercentGPUTime").and_then(|v| extract_f32(&v)) {
            total += val;
            count += 1;
        }
    }

    if count > 0 { total / count as f32 } else { 0.0 }
}

fn query_sensor_temp(conn: &WMIConnection) -> Option<f32> {
    let results: Vec<HashMap<String, Variant>> = conn
        .raw_query("SELECT Name, SensorType, Value FROM Sensor")
        .ok()?;

    for mut row in results {
        let stype = row.remove("SensorType").and_then(|v| extract_string(&v));
        if stype.as_deref() != Some("Temperature") {
            continue;
        }

        let name = row.remove("Name").and_then(|v| extract_string(&v))?;
        let lower = name.to_lowercase();
        if !lower.contains("cpu") && !lower.contains("package") && !lower.contains("core") {
            continue;
        }

        if let Some(val) = row.remove("Value").and_then(|v| extract_f32(&v)) {
            return Some(val);
        }
    }

    None
}

fn query_acpi_temp(conn: &WMIConnection) -> Option<f32> {
    let results: Vec<HashMap<String, Variant>> = conn
        .raw_query("SELECT CurrentTemperature FROM MSAcpi_ThermalZoneTemperature")
        .ok()?;

    results
        .into_iter()
        .next()
        .and_then(|mut map| map.remove("CurrentTemperature"))
        .and_then(|v| extract_f32(&v))
        .map(|k_tenths| k_tenths / 10.0 - 273.15)
}
