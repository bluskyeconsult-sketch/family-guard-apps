export interface Learner {
  id: string;
  family_id: string;
  display_name: string;
  active: boolean;
}

export interface Device {
  id: string;
  learner_id: string;
  family_id: string;
  name: string;
  device_owner: boolean;
  platform: string | null;
  app_version: string | null;
  last_seen_at: string | null;
}

export interface DeviceStatus {
  device_id: string;
  learner_id: string;
  battery: number | null;
  charging: boolean | null;
  dns_private_host: string | null;
  dns_ok: boolean | null;
  vpn_active: boolean | null;
  app_version: string | null;
  updated_at: string;
}

export interface Location {
  id: number;
  learner_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  battery: number | null;
  captured_at: string;
}

export interface Place {
  id: string;
  family_id: string;
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  notify_enter: boolean;
  notify_exit: boolean;
}

export interface ApprovedApp {
  id: string;
  learner_id: string;
  package_name: string;
  label: string | null;
}

export interface ChildSettings {
  learner_id: string;
  screen_time_minutes: number | null;
  quiet_start: string | null;
  quiet_end: string | null;
  launcher_enabled: boolean;
}

export interface Alert {
  id: string;
  family_id: string;
  learner_id: string | null;
  device_id: string | null;
  kind: string;
  severity: 'info' | 'warn' | 'high';
  title: string;
  body: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

export interface DailySummary {
  learner_id: string;
  summary_day: string;
  screen_minutes: number;
  apps_used: number;
  top_app: string | null;
  top_app_minutes: number;
  places_entered: number;
  alerts_count: number;
}

export type FeatureKey =
  | 'messenger'
  | 'safety_alerts'
  | 'insights'
  | 'weekly_digest'
  | 'hard_stop';
