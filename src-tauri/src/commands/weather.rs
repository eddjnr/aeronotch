use crate::weather::{WeatherClient, WeatherInfo};
use std::sync::Arc;

#[tauri::command]
pub async fn get_weather(state: tauri::State<'_, Arc<WeatherClient>>) -> Result<WeatherInfo, String> {
    state.get_weather().await
}

#[tauri::command]
pub async fn set_weather_location(
    state: tauri::State<'_, Arc<WeatherClient>>,
    latitude: f64,
    longitude: f64,
) -> Result<(), String> {
    state.set_location(latitude, longitude);
    Ok(())
}
