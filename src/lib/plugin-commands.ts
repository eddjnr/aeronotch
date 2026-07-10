import { invoke } from "@tauri-apps/api/core";

export async function getAppDataDir(): Promise<string> {
  return invoke<string>("get_app_data_dir");
}

export async function writePluginFile(relativePath: string, content: string): Promise<string> {
  return invoke<string>("write_plugin_file", { relativePath, content });
}

export async function readPluginFile(relativePath: string): Promise<string> {
  return invoke<string>("read_plugin_file", { relativePath });
}

export async function deletePluginFile(relativePath: string): Promise<void> {
  return invoke("delete_plugin_file", { relativePath });
}

export async function listPluginDir(relativePath: string): Promise<string[]> {
  return invoke<string[]>("list_plugin_dir", { relativePath });
}
