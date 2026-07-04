export function getWindowLabel(): string {
  const params = new URLSearchParams(window.location.search);
  let label = params.get('window') || 'main';
  try {
    const { getCurrentWebviewWindow } = require('@tauri-apps/api/webviewWindow');
    const tauriLabel = getCurrentWebviewWindow().label;
    if (tauriLabel) {
      label = tauriLabel;
    }
  } catch {
    // ignore
  }
  return label;
}
