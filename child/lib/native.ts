// Safe wrapper over the family-guard-native Android module. Each call falls
// back gracefully when a capability is unavailable (for example before the
// phone is set as device owner), so the JS never crashes on a missing native
// method. On a non-Android build, everything no-ops.
import { Platform } from 'react-native';
import FamilyGuardNative from '../modules/family-guard-native';

export interface NativeStatus {
  battery: number;
  charging: boolean;
  screen_on: boolean;
  dns_private_host: string | null;
  dns_ok: boolean;
  vpn_active: boolean;
  os_version: string;
  app_version: string;
  last_boot_at: string | null;
}

export interface UsageRow {
  package_name: string;
  label: string;
  minutes: number;
}

const android = Platform.OS === 'android' && !!FamilyGuardNative;

export const native = {
  available: android,

  async isDeviceOwner(): Promise<boolean> {
    if (!android) return false;
    try { return await FamilyGuardNative.isDeviceOwner(); } catch { return false; }
  },

  // Enforce the family Private DNS host (device-owner only). Returns true if set.
  async enforcePrivateDns(hostname: string): Promise<boolean> {
    if (!android) return false;
    try { return await FamilyGuardNative.setPrivateDns(hostname); } catch { return false; }
  },

  // Restrict which packages may run in lock-task / kiosk mode (device-owner).
  async setAllowedApps(packages: string[]): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.setLockTaskPackages(packages); } catch { /* ignore */ }
  },

  async launchApp(pkg: string): Promise<boolean> {
    if (!android) return false;
    try { return await FamilyGuardNative.launchApp(pkg); } catch { return false; }
  },

  // Hard stop: pin the launcher to a single screen, or release it.
  async lock(): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.startLockTask(); } catch { /* ignore */ }
  },
  async unlock(): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.stopLockTask(); } catch { /* ignore */ }
  },

  async getStatus(): Promise<NativeStatus | null> {
    if (!android) return null;
    try { return await FamilyGuardNative.getDeviceStatus(); } catch { return null; }
  },

  async getUsageToday(): Promise<UsageRow[]> {
    if (!android) return [];
    try { return await FamilyGuardNative.getUsageToday(); } catch { return []; }
  },

  // Start/stop the single battery-light foreground location service. The
  // service batches points and posts them to the API itself.
  async startLocationService(apiBase: string, token: string, intervalSec: number): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.startLocationService(apiBase, token, intervalSec); } catch { /* ignore */ }
  },
  async stopLocationService(): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.stopLocationService(); } catch { /* ignore */ }
  },

  async setAsHomeLauncher(): Promise<void> {
    if (!android) return;
    try { await FamilyGuardNative.setAsHomeLauncher(); } catch { /* ignore */ }
  },
};
