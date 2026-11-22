// All parent data access in one place. Every call runs as the signed-in
// parent, so row-level security limits it to their own family. Nothing here
// uses a service key.
import { supabase } from './supabase';
import type {
  Learner,
  Device,
  DeviceStatus,
  Location,
  Place,
  ApprovedApp,
  ChildSettings,
  Alert,
  DailySummary,
  FeatureKey,
} from './types';

// ---- children ---------------------------------------------------------
export async function listChildren(): Promise<Learner[]> {
  const { data, error } = await supabase
    .from('learners')
    .select('id,family_id,display_name,active')
    .eq('active', true)
    .order('display_name');
  if (error) throw error;
  return data as Learner[];
}

export async function familyId(): Promise<string | null> {
  const { data } = await supabase.from('learners').select('family_id').limit(1).maybeSingle();
  return data?.family_id ?? null;
}

// ---- devices + status + location --------------------------------------
export async function listDevices(learnerId: string): Promise<Device[]> {
  const { data, error } = await supabase
    .from('guard_devices')
    .select('id,learner_id,family_id,name,device_owner,platform,app_version,last_seen_at')
    .eq('learner_id', learnerId);
  if (error) throw error;
  return data as Device[];
}

export async function deviceStatus(learnerId: string): Promise<DeviceStatus[]> {
  const { data, error } = await supabase
    .from('guard_device_status')
    .select('device_id,learner_id,battery,charging,dns_private_host,dns_ok,vpn_active,app_version,updated_at')
    .eq('learner_id', learnerId);
  if (error) throw error;
  return data as DeviceStatus[];
}

export async function lastLocation(learnerId: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('guard_locations')
    .select('id,learner_id,lat,lng,accuracy_m,battery,captured_at')
    .eq('learner_id', learnerId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Location) ?? null;
}

export async function recentTrail(learnerId: string, limit = 50): Promise<Location[]> {
  const { data, error } = await supabase
    .from('guard_locations')
    .select('id,learner_id,lat,lng,accuracy_m,battery,captured_at')
    .eq('learner_id', learnerId)
    .order('captured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Location[];
}

// ---- enrol a new device (returns the token ONCE) ----------------------
export async function enrolDevice(
  learnerId: string,
  name: string,
  deviceOwner: boolean,
): Promise<{ device_id: string; token: string }> {
  const { data, error } = await supabase.rpc('guard_enrol_device', {
    p_learner_id: learnerId,
    p_name: name,
    p_device_owner: deviceOwner,
    p_platform: 'android',
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { device_id: row.device_id, token: row.token };
}

export async function renameDevice(deviceId: string, name: string): Promise<void> {
  const { error } = await supabase.from('guard_devices').update({ name }).eq('id', deviceId);
  if (error) throw error;
}

export async function removeDevice(deviceId: string): Promise<void> {
  const { error } = await supabase.from('guard_devices').delete().eq('id', deviceId);
  if (error) throw error;
}

// ---- approved apps ----------------------------------------------------
export async function listApps(learnerId: string): Promise<ApprovedApp[]> {
  const { data, error } = await supabase
    .from('guard_approved_apps')
    .select('id,learner_id,package_name,label')
    .eq('learner_id', learnerId)
    .order('label');
  if (error) throw error;
  return data as ApprovedApp[];
}

export async function addApp(
  learnerId: string,
  familyIdValue: string,
  pkg: string,
  label: string,
): Promise<void> {
  const { error } = await supabase
    .from('guard_approved_apps')
    .insert({ learner_id: learnerId, family_id: familyIdValue, package_name: pkg, label });
  if (error) throw error;
}

export async function removeApp(id: string): Promise<void> {
  const { error } = await supabase.from('guard_approved_apps').delete().eq('id', id);
  if (error) throw error;
}

// ---- child settings (screen time, launcher, quiet hours) --------------
export async function getChildSettings(learnerId: string): Promise<ChildSettings | null> {
  const { data, error } = await supabase
    .from('guard_child_settings')
    .select('learner_id,screen_time_minutes,quiet_start,quiet_end,launcher_enabled')
    .eq('learner_id', learnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChildSettings) ?? null;
}

export async function saveChildSettings(
  learnerId: string,
  familyIdValue: string,
  patch: Partial<ChildSettings>,
): Promise<void> {
  const { error } = await supabase
    .from('guard_child_settings')
    .upsert({ learner_id: learnerId, family_id: familyIdValue, ...patch }, { onConflict: 'learner_id' });
  if (error) throw error;
}

// ---- places / geofences ----------------------------------------------
export async function listPlaces(familyIdValue: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from('guard_places')
    .select('id,family_id,label,lat,lng,radius_m,notify_enter,notify_exit')
    .eq('family_id', familyIdValue)
    .order('label');
  if (error) throw error;
  return data as Place[];
}

export async function addPlace(place: Omit<Place, 'id'>): Promise<void> {
  const { error } = await supabase.from('guard_places').insert(place);
  if (error) throw error;
}

export async function removePlace(id: string): Promise<void> {
  const { error } = await supabase.from('guard_places').delete().eq('id', id);
  if (error) throw error;
}

// ---- alerts -----------------------------------------------------------
export async function listAlerts(onlyUnack = false): Promise<Alert[]> {
  let q = supabase
    .from('guard_alerts')
    .select('id,family_id,learner_id,device_id,kind,severity,title,body,created_at,acknowledged_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (onlyUnack) q = q.is('acknowledged_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return data as Alert[];
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const { data: who } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('guard_alerts')
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: who.user?.id ?? null })
    .eq('id', id);
  if (error) throw error;
}

// ---- insights ---------------------------------------------------------
export async function dailySummaries(learnerId: string, days = 14): Promise<DailySummary[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const { data, error } = await supabase
    .from('guard_daily_summary')
    .select('learner_id,summary_day,screen_minutes,apps_used,top_app,top_app_minutes,places_entered,alerts_count')
    .eq('learner_id', learnerId)
    .gte('summary_day', since.toISOString().slice(0, 10))
    .order('summary_day');
  if (error) throw error;
  return data as DailySummary[];
}

// ---- feature switches -------------------------------------------------
export async function getFeatures(familyIdValue: string): Promise<Record<FeatureKey, boolean>> {
  const defaults: Record<FeatureKey, boolean> = {
    messenger: true,
    safety_alerts: true,
    insights: true,
    weekly_digest: true,
    hard_stop: true,
  };
  const { data, error } = await supabase
    .from('guard_feature_flags')
    .select('feature,enabled')
    .eq('family_id', familyIdValue);
  if (error) throw error;
  for (const row of data ?? []) defaults[row.feature as FeatureKey] = row.enabled as boolean;
  return defaults;
}

export async function setFeature(
  familyIdValue: string,
  feature: FeatureKey,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('guard_feature_flags')
    .upsert({ family_id: familyIdValue, feature, enabled }, { onConflict: 'family_id,feature' });
  if (error) throw error;
}

// ---- family settings (DNS host, PIN) ----------------------------------
export async function getDnsHost(familyIdValue: string): Promise<string> {
  const { data } = await supabase
    .from('guard_family_settings')
    .select('dns_hostname')
    .eq('family_id', familyIdValue)
    .maybeSingle();
  return data?.dns_hostname ?? 'family.cloudflare-dns.com';
}

export async function setDnsHost(familyIdValue: string, host: string): Promise<void> {
  const { error } = await supabase
    .from('guard_family_settings')
    .upsert({ family_id: familyIdValue, dns_hostname: host }, { onConflict: 'family_id' });
  if (error) throw error;
}

// ---- hard stop (remote lock) -----------------------------------------
export async function getHardStop(learnerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('guard_hard_stop')
    .select('locked')
    .eq('learner_id', learnerId)
    .maybeSingle();
  return data?.locked === true;
}

export async function setHardStop(
  learnerId: string,
  familyIdValue: string,
  locked: boolean,
  reason: string,
): Promise<void> {
  const { data: who } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('guard_hard_stop')
    .upsert(
      { learner_id: learnerId, family_id: familyIdValue, locked, reason, set_by: who.user?.id ?? null },
      { onConflict: 'learner_id' },
    );
  if (error) throw error;
}

// ---- messenger --------------------------------------------------------
export async function listThreads(): Promise<{ id: string; title: string | null; updated_at: string }[]> {
  const { data, error } = await supabase
    .from('guard_threads')
    .select('id,title,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as { id: string; title: string | null; updated_at: string }[];
}

export async function createDirectThread(
  familyIdValue: string,
  learnerId: string,
  title: string,
): Promise<string> {
  const { data: who } = await supabase.auth.getUser();
  const { data: thread, error } = await supabase
    .from('guard_threads')
    .insert({ family_id: familyIdValue, title, is_group: false, created_by: who.user?.id ?? null })
    .select('id')
    .single();
  if (error) throw error;
  const threadId = thread.id as string;
  const rows = [
    { thread_id: threadId, family_id: familyIdValue, member_kind: 'parent', user_id: who.user?.id },
    { thread_id: threadId, family_id: familyIdValue, member_kind: 'child', learner_id: learnerId },
  ];
  const { error: mErr } = await supabase.from('guard_thread_members').insert(rows);
  if (mErr) throw mErr;
  return threadId;
}

export async function fetchMessages(
  threadId: string,
  before?: string,
): Promise<{ id: string; sender_kind: string; body: string; created_at: string }[]> {
  let q = supabase
    .from('guard_messages')
    .select('id,sender_kind,body,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw error;
  return data as { id: string; sender_kind: string; body: string; created_at: string }[];
}

export async function sendMessage(
  threadId: string,
  familyIdValue: string,
  body: string,
): Promise<void> {
  const { data: who } = await supabase.auth.getUser();
  const { error } = await supabase.from('guard_messages').insert({
    thread_id: threadId,
    family_id: familyIdValue,
    sender_kind: 'parent',
    sender_user_id: who.user?.id,
    body: body.slice(0, 4000),
  });
  if (error) throw error;
}
