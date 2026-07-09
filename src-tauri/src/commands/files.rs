use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows::Win32::Foundation::HWND;
use windows::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
};
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GHND};
use windows::Win32::UI::Shell::DROPFILES;

#[tauri::command]
pub fn copy_files_to_clipboard(paths: Vec<String>) -> Result<(), String> {
    let mut buffer: Vec<u16> = Vec::new();
    for path in &paths {
        let os_str = OsStr::new(path);
        buffer.extend(os_str.encode_wide());
        buffer.push(0);
    }
    buffer.push(0);

    let dropfiles_size = std::mem::size_of::<DROPFILES>();
    let total_size = dropfiles_size + (buffer.len() * 2);

    unsafe {
        let h_global = GlobalAlloc(GHND, total_size).map_err(|e| e.to_string())?;
        let p_global = GlobalLock(h_global);
        if p_global.is_null() {
            return Err("Failed to lock global memory".to_string());
        }

        let dropfiles = p_global as *mut DROPFILES;
        (*dropfiles).pFiles = dropfiles_size as u32;
        (*dropfiles).fWide = windows::Win32::Foundation::BOOL::from(true);

        let p_paths = (p_global as *mut u8).add(dropfiles_size) as *mut u16;
        std::ptr::copy_nonoverlapping(buffer.as_ptr(), p_paths, buffer.len());

        let _ = GlobalUnlock(h_global);

        OpenClipboard(HWND::default()).map_err(|e| e.to_string())?;
        EmptyClipboard().map_err(|e| e.to_string())?;
        SetClipboardData(15, windows::Win32::Foundation::HANDLE(h_global.0))
            .map_err(|e| e.to_string())?;
        CloseClipboard().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(serde::Serialize)]
pub struct FileMetadata {
    name: String,
    path: String,
    size: u64,
    is_dir: bool,
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    use std::fs;
    use std::path::Path;

    let path_buf = Path::new(&path);
    if !path_buf.exists() {
        return Err("File does not exist".to_string());
    }

    let name = path_buf
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());

    let metadata = fs::metadata(path_buf).map_err(|e| e.to_string())?;

    Ok(FileMetadata {
        name,
        path,
        size: metadata.len(),
        is_dir: metadata.is_dir(),
    })
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    use std::process::Command;
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_file_on_disk(path: String, new_name: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let old_path = Path::new(&path);
    if !old_path.exists() {
        return Err("File does not exist".to_string());
    }

    let parent = old_path.parent().ok_or("Cannot resolve parent folder")?;
    let new_path = parent.join(new_name);

    fs::rename(old_path, &new_path).map_err(|e| e.to_string())?;

    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_file_on_disk(path: String) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use windows::core::PCWSTR;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let path_wide: Vec<u16> = OsStr::new(&path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let operation_wide: Vec<u16> = OsStr::new("open")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let result = ShellExecuteW(
            HWND::default(),
            PCWSTR(operation_wide.as_ptr()),
            PCWSTR(path_wide.as_ptr()),
            PCWSTR(std::ptr::null()),
            PCWSTR(std::ptr::null()),
            SW_SHOWNORMAL,
        );

        if result.0 as usize <= 32 {
            return Err(format!("Failed to open file: ShellExecuteW error code {}", result.0 as usize));
        }
    }

    Ok(())
}
