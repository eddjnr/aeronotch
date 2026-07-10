import { invoke } from "@tauri-apps/api/core";

export async function saveSecureToken(accountId: string, token: string): Promise<void> {
  return invoke("save_secure_token", { accountId, token });
}

export async function getSecureToken(accountId: string): Promise<string | null> {
  return invoke<string | null>("get_secure_token", { accountId });
}

export async function deleteSecureToken(accountId: string): Promise<void> {
  return invoke("delete_secure_token", { accountId });
}
