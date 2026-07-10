use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

const KEYRING_SERVICE: &str = "winotch-github-plugin";

static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .user_agent("AeroNotch")
        .build()
        .expect("Failed to build reqwest client")
});

/// Saves a password or token securely associated with a service and account.
#[tauri::command]
pub fn save_secure_token(account_id: String, token: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &account_id)
        .map_err(|e| format!("Failed to initialize secure keyring entry: {e}"))?;

    entry.set_password(&token)
        .map_err(|e| format!("Failed to write to secure storage: {e}"))
}

/// Retrieves a saved secure token. Returns None if it doesn't exist.
#[tauri::command]
pub fn get_secure_token(account_id: String) -> Result<Option<String>, String> {
    let entry = Entry::new(KEYRING_SERVICE, &account_id)
        .map_err(|e| format!("Failed to initialize secure keyring entry: {e}"))?;

    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read from secure storage: {e}")),
    }
}

/// Deletes a saved secure token.
#[tauri::command]
pub fn delete_secure_token(account_id: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &account_id)
        .map_err(|e| format!("Failed to initialize secure keyring entry: {e}"))?;

    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete from secure storage: {e}")),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: Option<u64>,
}

#[tauri::command]
pub async fn github_request_device_code(client_id: String, scope: String) -> Result<DeviceCodeResponse, String> {
    let res = HTTP_CLIENT
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": client_id,
            "scope": scope,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {e}"))?;

    res.json::<DeviceCodeResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccessTokenResponse {
    pub access_token: Option<String>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn github_poll_access_token(client_id: String, device_code: String) -> Result<AccessTokenResponse, String> {
    let res = HTTP_CLIENT
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": client_id,
            "device_code": device_code,
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {e}"))?;

    res.json::<AccessTokenResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))
}
