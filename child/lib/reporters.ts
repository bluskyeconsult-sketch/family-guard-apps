// Orchestrates the light periodic work on the child phone:
//  - pull the policy, enforce DNS + allowlist + hard-stop
//  - report device status and today app usage
// Location is handled by the native foreground service (battery-light),
// which posts points to the API on its own schedule, so JS does not keep a
// location loop alive.
import { api, Policy } from './api';
import { native } from './native';
import { getToken } from './token';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE as string) ?? '';
const LOCATION_INTERVAL_SEC = 600; // 10 minutes — gentle on the battery

export async function applyPolicy(): Promise<Policy | null> {
  let policy: Policy;
  try {
    policy = await api.getConfig();
  } catch {
    return null;
  }

  await native.enforcePrivateDns(policy.dns_hostname);
  await native.setAllowedApps(policy.approved_apps.map((a) => a.package));

  if (policy.hard_stop.enabled && policy.hard_stop.locked) {
    await native.lock();
  } else {
    await native.unlock();
  }

  const token = await getToken();
  if (token) {
    await native.startLocationService(API_BASE, token, LOCATION_INTERVAL_SEC);
  }
  return policy;
}

export async function reportStatus(): Promise<void> {
  const status = await native.getStatus();
  if (!status) return;
  try {
    await api.ingest({
      status: {
        battery: status.battery,
        charging: status.charging,
        screen_on: status.screen_on,
        dns_private_host: status.dns_private_host ?? undefined,
        dns_ok: status.dns_ok,
        vpn_active: status.vpn_active,
        app_version: status.app_version,
        os_version: status.os_version,
        last_boot_at: status.last_boot_at ?? undefined,
      },
    });
  } catch {
    /* offline — try again next tick */
  }
}

export async function reportUsage(): Promise<void> {
  const rows = await native.getUsageToday();
  if (rows.length === 0) return;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await api.ingest({
      usage: rows.map((r) => ({
        usage_day: day,
        package_name: r.package_name,
        label: r.label,
        minutes: r.minutes,
      })),
    });
  } catch {
    /* offline — try again next tick */
  }
}

// Called on the app foreground tick (e.g. every few minutes while open, and
// from a light background task). Keeps network use small and batched.
export async function tick(): Promise<Policy | null> {
  const policy = await applyPolicy();
  await reportStatus();
  await reportUsage();
  return policy;
}
