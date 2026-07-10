use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Validates that `child` is a descendant of `base`.
/// Returns the canonicalized child path, or an error if it escapes the base.
fn validate_within_base(base: &Path, relative_path: &str) -> Result<PathBuf, String> {
    // Reject paths with `..` segments before joining — catches the most obvious traversal
    if relative_path.contains("..") {
        return Err("Path must not contain '..' segments".to_string());
    }

    let full_path = base.join(relative_path);

    // Canonicalize both to resolve symlinks and compare. If the child doesn't
    // exist yet (e.g. write), canonicalize the parent instead.
    let resolved = if full_path.exists() {
        full_path
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path: {e}"))?
    } else {
        // Walk up to the nearest existing ancestor and canonicalize that
        let mut ancestor = full_path.as_path();
        while !ancestor.exists() {
            ancestor = ancestor.parent().unwrap_or(ancestor);
        }
        let resolved_ancestor = ancestor
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path: {e}"))?;
        // Re-join the remaining relative portion
        match full_path.strip_prefix(ancestor) {
            Ok(rel) => resolved_ancestor.join(rel),
            Err(_) => return Err("Path escapes the allowed directory".to_string()),
        }
    };

    let resolved_base = base
        .canonicalize()
        .map_err(|e| format!("Failed to resolve base path: {e}"))?;

    if !resolved.starts_with(&resolved_base) {
        return Err("Path escapes the allowed directory".to_string());
    }

    Ok(full_path)
}

/// Returns the app's data directory path.
/// Plugins will be stored at: {app_data_dir}/plugins/{plugin_id}/
#[tauri::command]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Writes arbitrary text content to a file inside the app's data directory.
/// `relative_path` is relative to app_data_dir, e.g. "plugins/test/compact.js".
/// Creates parent directories as needed.
#[tauri::command]
pub fn write_plugin_file(
    app: AppHandle,
    relative_path: String,
    content: String,
) -> Result<String, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let full_path = validate_within_base(&base, &relative_path)?;

    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {e}"))?;
    }

    std::fs::write(&full_path, &content)
        .map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(full_path.to_string_lossy().to_string())
}

/// Reads a file from the app's data directory.
/// Returns the file content as a string.
#[tauri::command]
pub fn read_plugin_file(
    app: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let full_path = validate_within_base(&base, &relative_path)?;

    std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file '{relative_path}': {e}"))
}

/// Deletes a file or directory from the app's data directory.
#[tauri::command]
pub fn delete_plugin_file(
    app: AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let full_path = validate_within_base(&base, &relative_path)?;

    if full_path.is_dir() {
        std::fs::remove_dir_all(&full_path)
            .map_err(|e| format!("Failed to remove directory: {e}"))
    } else {
        std::fs::remove_file(&full_path)
            .map_err(|e| format!("Failed to remove file: {e}"))
    }
}

/// Lists files in a directory inside the app's data directory.
#[tauri::command]
pub fn list_plugin_dir(
    app: AppHandle,
    relative_path: String,
) -> Result<Vec<String>, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let full_path = validate_within_base(&base, &relative_path)?;

    if !full_path.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&full_path)
        .map_err(|e| format!("Failed to read directory: {e}"))?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();

    Ok(entries)
}
