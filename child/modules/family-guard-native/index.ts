// JS surface for the family-guard-native Android module. On platforms where
// the native module is not present (web, or before a dev build), this is null
// and the lib/native.ts wrapper no-ops.
import { requireOptionalNativeModule } from 'expo-modules-core';

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

export interface FamilyGuardNativeModule {
  isDeviceOwner(): Promise<boolean>;
  setPrivateDns(hostname: string): Promise<boolean>;
  setLockTaskPackages(packages: string[]): Promise<void>;
  startLockTask(): Promise<void>;
  stopLockTask(): Promise<void>;
  launchApp(packageName: string): Promise<boolean>;
  getDeviceStatus(): Promise<NativeStatus>;
  getUsageToday(): Promise<UsageRow[]>;
  startLocationService(apiBase: string, token: string, intervalSec: number): Promise<void>;
  stopLocationService(): Promise<void>;
  setAsHomeLauncher(): Promise<void>;
}

export default requireOptionalNativeModule<FamilyGuardNativeModule>('FamilyGuardNative');
