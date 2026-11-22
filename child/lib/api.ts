// Thin client for the Family Guard API. Every call carries the device token.
// The child phone never talks to Supabase directly.
import { getToken } from './token';

const BASE = (process.env.EXPO_PUBLIC_API_BASE as string) ?? '';

async function call(path: string, method: 'GET' | 'POST', body?: unknown): Promise<any> {
  const token = await getToken();
  if (!token) throw new Error('not_enrolled');
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'x-device-token': token,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(`api_${resp.status}`);
  return resp.json();
}

export interface Policy {
  dns_hostname: string;
  screen_time_minutes: number | null;
  quiet_start: string | null;
  quiet_end: string | null;
  launcher_enabled: boolean;
  approved_apps: { package: string; label: string | null }[];
  hard_stop: { enabled: boolean; locked: boolean; reason: string | null };
  features: { messenger: boolean; safety_alerts: boolean; hard_stop: boolean };
}

export interface IngestBody {
  locations?: {
    lat: number;
    lng: number;
    accuracy_m?: number;
    speed_mps?: number;
    battery?: number;
    captured_at: string;
  }[];
  status?: {
    battery?: number;
    charging?: boolean;
    screen_on?: boolean;
    dns_private_host?: string;
    dns_ok?: boolean;
    vpn_active?: boolean;
    app_version?: string;
    os_version?: string;
    last_boot_at?: string;
  };
  usage?: { usage_day: string; package_name: string; label?: string; minutes: number }[];
  alerts?: { kind: string; severity?: string; title?: string; body?: string; data?: Record<string, unknown> }[];
}

export const api = {
  getConfig: (): Promise<Policy> => call('/api/device/config', 'GET'),
  ingest: (body: IngestBody): Promise<any> => call('/api/device/ingest', 'POST', body),
  listThreads: (): Promise<{ threads: { thread_id: string; title: string | null }[] }> =>
    call('/api/device/messages', 'GET'),
  fetchMessages: (threadId: string): Promise<{ messages: any[] }> =>
    call(`/api/device/messages?thread_id=${encodeURIComponent(threadId)}`, 'GET'),
  send: (threadId: string, body: string): Promise<{ id: string }> =>
    call('/api/device/messages', 'POST', { thread_id: threadId, body }),
};
