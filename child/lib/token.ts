// The device token is written once at enrolment and kept in the OS secure
// store. It never leaves the device except as the x-device-token header to
// the Family Guard API over HTTPS.
import * as SecureStore from 'expo-secure-store';

const KEY = 'fg_device_token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
