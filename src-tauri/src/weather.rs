use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Weather data exposed to the frontend.
#[derive(Debug, Serialize, Clone, Default)]
pub struct WeatherInfo {
    pub temperature: f64,
    pub apparent_temperature: f64,
    pub weather_code: u32,
    pub weather_description: String,
    pub humidity: f64,
    pub wind_speed: f64,
    pub is_day: bool,
}

// ── Open-Meteo JSON shapes ──

#[derive(Debug, Deserialize)]
struct OpenMeteoResponse {
    current: Option<OpenMeteoCurrent>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoCurrent {
    temperature_2m: f64,
    apparent_temperature: f64,
    weather_code: u32,
    relative_humidity_2m: f64,
    wind_speed_10m: f64,
    is_day: u8,
}

/// Async weather client with a 15-minute in-memory cache.
/// Backed by the free Open-Meteo API (no API key required).
pub struct WeatherClient {
    cache: Mutex<Option<(WeatherInfo, Instant)>>,
    latitude: Mutex<f64>,
    longitude: Mutex<f64>,
}

impl WeatherClient {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(None),
            // Default: São Paulo, Brazil — user can change in settings
            latitude: Mutex::new(-23.5505),
            longitude: Mutex::new(-46.6333),
        }
    }

    /// Update the coordinates used for weather lookups and bust the cache.
    pub fn set_location(&self, lat: f64, lon: f64) {
        *self.latitude.lock().unwrap() = lat;
        *self.longitude.lock().unwrap() = lon;
        // Clear cache to force re-fetch with new coords
        *self.cache.lock().unwrap() = None;
    }

    /// Fetch current weather, returning a cached value when still fresh.
    pub async fn get_weather(&self) -> Result<WeatherInfo, String> {
        // Check cache (15-minute TTL)
        if let Some((cached, timestamp)) = self.cache.lock().unwrap().as_ref() {
            if timestamp.elapsed() < Duration::from_secs(900) {
                return Ok(cached.clone());
            }
        }

        let lat = *self.latitude.lock().unwrap();
        let lon = *self.longitude.lock().unwrap();

        let url = format!(
            "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}\
             &current=temperature_2m,apparent_temperature,weather_code,\
             relative_humidity_2m,wind_speed_10m,is_day",
            lat, lon
        );

        let response = reqwest::get(&url)
            .await
            .map_err(|e| format!("Failed to fetch weather: {}", e))?;

        let data: OpenMeteoResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse weather response: {}", e))?;

        let current = data.current.ok_or("No current weather data")?;

        let weather = WeatherInfo {
            temperature: current.temperature_2m,
            apparent_temperature: current.apparent_temperature,
            weather_code: current.weather_code,
            weather_description: weather_code_to_description(current.weather_code),
            humidity: current.relative_humidity_2m,
            wind_speed: current.wind_speed_10m,
            is_day: current.is_day == 1,
        };

        // Update cache
        *self.cache.lock().unwrap() = Some((weather.clone(), Instant::now()));

        Ok(weather)
    }
}

/// Map WMO weather codes to human-readable descriptions.
fn weather_code_to_description(code: u32) -> String {
    match code {
        0 => "Clear sky".to_string(),
        1 => "Mainly clear".to_string(),
        2 => "Partly cloudy".to_string(),
        3 => "Overcast".to_string(),
        45 | 48 => "Foggy".to_string(),
        51 | 53 | 55 => "Drizzle".to_string(),
        56 | 57 => "Freezing drizzle".to_string(),
        61 | 63 | 65 => "Rain".to_string(),
        66 | 67 => "Freezing rain".to_string(),
        71 | 73 | 75 => "Snow".to_string(),
        77 => "Snow grains".to_string(),
        80 | 81 | 82 => "Rain showers".to_string(),
        85 | 86 => "Snow showers".to_string(),
        95 => "Thunderstorm".to_string(),
        96 | 99 => "Thunderstorm with hail".to_string(),
        _ => "Unknown".to_string(),
    }
}
