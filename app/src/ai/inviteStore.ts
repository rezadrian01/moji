import * as SecureStore from 'expo-secure-store';

const KEY = 'moji.invite';

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function getInviteCode(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setInviteCode(code: string | null): Promise<void> {
  if (code === null) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  await SecureStore.setItemAsync(KEY, normalizeInviteCode(code));
}
