use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tauri::{Manager, Emitter};

// Default Google OAuth credentials for AeroNotch (developers can override this in settings)
const DEFAULT_CLIENT_ID: &str = "754716168536-474oamre5hbg7k5i645i7s6h4a6o5o22.apps.googleusercontent.com"; // Placeholder Client ID
const DEFAULT_CLIENT_SECRET: &str = "GOCSPX-placeholder-secret-key-aeronotch"; // Placeholder Client Secret

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoogleCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64, // Unix timestamp in seconds
    pub email: String,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
}

pub fn get_credentials_path(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    // Ensure parent directory exists
    let _ = std::fs::create_dir_all(&path);
    path.push("google_credentials.json");
    path
}

pub fn load_credentials(app: &tauri::AppHandle) -> Option<GoogleCredentials> {
    let path = get_credentials_path(app);
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_credentials(app: &tauri::AppHandle, creds: &GoogleCredentials) -> Result<(), String> {
    let path = get_credentials_path(app);
    let content = serde_json::to_string_pretty(creds).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_credentials(app: &tauri::AppHandle) -> Result<(), String> {
    let path = get_credentials_path(app);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

async fn refresh_access_token(app: &tauri::AppHandle, creds: &mut GoogleCredentials) -> Result<(), String> {
    let client_id = creds.client_id.as_deref().unwrap_or(DEFAULT_CLIENT_ID);
    let client_secret = creds.client_secret.as_deref().unwrap_or(DEFAULT_CLIENT_SECRET);

    let client = reqwest::Client::new();
    let params = [
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("refresh_token", &creds.refresh_token),
        ("grant_type", "refresh_token"),
    ];

    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Google OAuth token refresh rejected: {}", err_body));
    }

    #[derive(Deserialize)]
    struct RefreshResponse {
        access_token: String,
        expires_in: u64,
    }

    let token_resp: RefreshResponse = res.json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    creds.access_token = token_resp.access_token;
    
    // Set expires_at
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    creds.expires_at = now + token_resp.expires_in;

    save_credentials(app, creds)?;
    Ok(())
}

pub async fn get_valid_access_token(app: &tauri::AppHandle) -> Result<String, String> {
    let mut creds = load_credentials(app).ok_or_else(|| "Not authenticated with Google".to_string())?;
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // If token is expired or expiring in less than 60 seconds, refresh it
    if creds.expires_at <= now + 60 {
        refresh_access_token(app, &mut creds).await?;
    }

    Ok(creds.access_token)
}

async fn fetch_user_email(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client.get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err("Failed to fetch userinfo from Google".to_string());
    }

    #[derive(Deserialize)]
    struct UserInfo {
        email: String,
    }

    let info: UserInfo = res.json().await.map_err(|e| e.to_string())?;
    Ok(info.email)
}

pub async fn fetch_events(access_token: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Get current time in RFC3339 format
    let now_rfc3339 = {
        let now = std::time::SystemTime::now();
        let datetime: chrono::DateTime<chrono::Utc> = now.into();
        datetime.to_rfc3339()
    };

    let url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={}&maxResults=10&singleEvents=true&orderBy=startTime",
        urlencoding::encode(&now_rfc3339)
    );

    let res = client.get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch calendar events: {}", body));
    }

    let events: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(events)
}

pub async fn connect_flow(
    app: tauri::AppHandle,
    custom_client_id: Option<String>,
    custom_client_secret: Option<String>
) -> Result<String, String> {
    let client_id = custom_client_id.as_deref().unwrap_or(DEFAULT_CLIENT_ID).to_string();
    let client_secret = custom_client_secret.as_deref().unwrap_or(DEFAULT_CLIENT_SECRET).to_string();

    // Start local loopback TCP listener on port 8420
    let listener = TcpListener::bind("127.0.0.1:8420")
        .await
        .map_err(|e| format!("Could not bind port 8420: {}. Please make sure no other instance is running.", e))?;

    // Create the OAuth URL
    let redirect_uri = "http://localhost:8420";
    let scopes = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
    
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        urlencoding::encode(&client_id),
        urlencoding::encode(redirect_uri),
        urlencoding::encode(scopes)
    );

    // Open browser securely using Windows Command
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", &auth_url])
        .spawn();

    // Wait for redirect connection on port 8420
    let code = match listener.accept().await {
        Ok((mut socket, _)) => {
            let mut buffer = [0; 2048];
            let bytes_read = socket.read(&mut buffer).await.unwrap_or(0);
            let request = String::from_utf8_lossy(&buffer[..bytes_read]);

            let code = if let Some(code_pos) = request.find("code=") {
                let rest = &request[code_pos + 5..];
                let end = rest.find('&').unwrap_or_else(|| rest.find(' ').unwrap_or(rest.len()));
                Some(rest[..end].to_string())
            } else {
                None
            };

            let response_html = if code.is_some() {
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
                 <html><body style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; text-align: center; padding-top: 60px; background-color: #f5f5f7; color: #1d1d1f;'>\
                 <div style='max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);'>\
                 <h2 style='color: #051265;'>Authentication Successful!</h2>\
                 <p style='color: #86868b;'>AeroNotch has successfully linked with Google Calendar.</p>\
                 <p style='font-size: 13px; color: #86868b; margin-top: 20px;'>You can close this tab now.</p>\
                 </div></body></html>"
            } else {
                "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n\
                 <html><body><h2>Authentication Failed</h2><p>Could not capture authentication code.</p></body></html>"
            };

            let _ = socket.write_all(response_html.as_bytes()).await;
            let _ = socket.flush().await;

            code
        }
        Err(_) => None,
    };

    let code = code.ok_or_else(|| "Failed to capture Google auth code from local callback".to_string())?;

    // Exchange auth code for tokens
    let client = reqwest::Client::new();
    let params = [
        ("code", code.as_str()),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Exchange request failed: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Google rejected code exchange: {}", err_body));
    }

    #[derive(Deserialize)]
    struct TokenResponse {
        access_token: String,
        refresh_token: String,
        expires_in: u64,
    }

    let token_resp: TokenResponse = res.json()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    // Fetch user profile email
    let email = fetch_user_email(&token_resp.access_token).await
        .unwrap_or_else(|_| "Connected Account".to_string());

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let creds = GoogleCredentials {
        access_token: token_resp.access_token,
        refresh_token: token_resp.refresh_token,
        expires_at: now + token_resp.expires_in,
        email: email.clone(),
        client_id: if custom_client_id.is_some() { Some(client_id) } else { None },
        client_secret: if custom_client_secret.is_some() { Some(client_secret) } else { None },
    };

    save_credentials(&app, &creds)?;
    Ok(email)
}

pub fn start_polling(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            if let Ok(access_token) = get_valid_access_token(&app).await {
                if let Ok(events) = fetch_events(&access_token).await {
                    let _ = app.emit("google-calendar-events", &events);
                }
            }
            // Poll calendar events every 5 minutes (300 seconds)
            tokio::time::sleep(std::time::Duration::from_secs(300)).await;
        }
    });
}
