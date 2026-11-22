import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Linking, Alert as RNAlert, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as guard from '../../lib/guard';
import type { Device, DeviceStatus, Location, ApprovedApp, Place, ChildSettings, DailySummary } from '../../lib/types';
import { Card, H1, H2, P, Dim, Button, Badge, theme } from '../../components/ui';
import { BarChart } from '../../components/BarChart';

export default function ChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const learnerId = String(id);
  const [fam, setFam] = useState<string>('');
  const [name, setName] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [status, setStatus] = useState<DeviceStatus[]>([]);
  const [loc, setLoc] = useState<Location | null>(null);
  const [apps, setApps] = useState<ApprovedApp[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [settings, setSettings] = useState<ChildSettings | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [locked, setLocked] = useState(false);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [newToken, setNewToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    const children = await guard.listChildren();
    const me = children.find((c) => c.id === learnerId);
    setName(me?.display_name ?? 'Child');
    setFam(me?.family_id ?? '');
    const famId = me?.family_id ?? '';
    const [d, s, l, a, p, cs, sum, hs, f] = await Promise.all([
      guard.listDevices(learnerId),
      guard.deviceStatus(learnerId),
      guard.lastLocation(learnerId),
      guard.listApps(learnerId),
      guard.listPlaces(famId),
      guard.getChildSettings(learnerId),
      guard.dailySummaries(learnerId, 14),
      guard.getHardStop(learnerId),
      guard.getFeatures(famId),
    ]);
    setDevices(d); setStatus(s); setLoc(l); setApps(a); setPlaces(p);
    setSettings(cs); setSummaries(sum); setLocked(hs); setFeatures(f);
  }, [learnerId]);

  useEffect(() => { load(); }, [load]);

  const latest = status.slice().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <H1>{name}</H1>

      {/* Overview */}
      <Card>
        <H2>Right now</H2>
        {loc ? (
          <>
            <P>Last location {timeAgo(loc.captured_at)}{loc.accuracy_m ? ` · ±${Math.round(loc.accuracy_m)}m` : ''}.</P>
            <Button
              title="Open in Maps"
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${loc.lat},${loc.lng}`)}
            />
          </>
        ) : (
          <Dim>No location yet. It appears once the child phone checks in.</Dim>
        )}
        <View style={{ height: 8 }} />
        {latest ? (
          <View style={styles.badges}>
            {latest.battery != null ? <Badge text={`Battery ${latest.battery}%`} tone={latest.battery <= 15 ? 'warn' : 'good'} /> : null}
            <Badge text={latest.dns_ok === false ? 'Filter off' : 'Filter on'} tone={latest.dns_ok === false ? 'warn' : 'good'} />
            {latest.vpn_active ? <Badge text="VPN seen" tone="high" /> : null}
          </View>
        ) : null}
      </Card>

      {/* Devices + enrol */}
      <Card>
        <H2>Devices</H2>
        {devices.map((d) => (
          <View key={d.id} style={styles.listRow}>
            <P>{d.name}{d.device_owner ? ' · owner' : ''}</P>
            <Pressable onPress={() => confirmRemoveDevice(d.id, load)}>
              <Dim>Remove</Dim>
            </Pressable>
          </View>
        ))}
        {newToken ? (
          <View style={styles.tokenBox}>
            <Dim>Enrolment code — shown once. Type it into the child phone now.</Dim>
            <P style={{ fontWeight: '700', marginTop: 6 }} selectable>{newToken}</P>
          </View>
        ) : null}
        <Button
          title="Enrol a new device"
          onPress={async () => {
            const res = await guard.enrolDevice(learnerId, `${name} phone`, true);
            setNewToken(res.token);
            await load();
          }}
        />
      </Card>

      {/* Approved apps */}
      <Card>
        <H2>Approved apps</H2>
        <Dim>Only these open on the child phone. YouTube stays available.</Dim>
        {apps.map((a) => (
          <View key={a.id} style={styles.listRow}>
            <P>{a.label ?? a.package_name}</P>
            <Pressable onPress={async () => { await guard.removeApp(a.id); await load(); }}>
              <Dim>Remove</Dim>
            </Pressable>
          </View>
        ))}
        <AddApp onAdd={async (pkg, label) => { await guard.addApp(learnerId, fam, pkg, label); await load(); }} />
      </Card>

      {/* Places */}
      <Card>
        <H2>Places</H2>
        <Dim>You are told when they arrive or leave.</Dim>
        {places.map((p) => (
          <View key={p.id} style={styles.listRow}>
            <P>{p.label} · {p.radius_m}m</P>
            <Pressable onPress={async () => { await guard.removePlace(p.id); await load(); }}>
              <Dim>Remove</Dim>
            </Pressable>
          </View>
        ))}
        <AddPlace onAdd={async (label, lat, lng, radius) => {
          await guard.addPlace({ family_id: fam, label, lat, lng, radius_m: radius, notify_enter: true, notify_exit: true });
          await load();
        }} />
      </Card>

      {/* Screen time */}
      <Card>
        <H2>Screen time</H2>
        <ScreenTime
          settings={settings}
          onSave={async (minutes) => {
            await guard.saveChildSettings(learnerId, fam, { screen_time_minutes: minutes });
            await load();
          }}
        />
      </Card>

      {/* Insights */}
      {features.insights !== false ? (
        <Card>
          <H2>Screen time, last 14 days</H2>
          {summaries.length ? (
            <BarChart data={summaries.map((s) => ({ label: s.summary_day.slice(5), value: s.screen_minutes }))} unit="m" />
          ) : (
            <Dim>Charts appear after a few days of use.</Dim>
          )}
        </Card>
      ) : null}

      {/* Hard stop */}
      {features.hard_stop !== false ? (
        <Card>
          <H2>Hard stop</H2>
          <P>{locked ? 'The phone is locked to one screen.' : 'The phone is unlocked.'}</P>
          <Button
            title={locked ? 'Unlock now' : 'Lock the phone now'}
            kind={locked ? 'primary' : 'danger'}
            onPress={async () => {
              await guard.setHardStop(learnerId, fam, !locked, locked ? '' : 'Locked by parent');
              setLocked(!locked);
            }}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function AddApp({ onAdd }: { onAdd: (pkg: string, label: string) => void }) {
  const [pkg, setPkg] = useState('');
  const [label, setLabel] = useState('');
  return (
    <View style={{ marginTop: 10 }}>
      <TextInput style={styles.input} placeholder="App name (e.g. Family Tutor)" placeholderTextColor={theme.dim} value={label} onChangeText={setLabel} />
      <TextInput style={styles.input} placeholder="Package (e.g. com.odusbaba.familytutor)" placeholderTextColor={theme.dim} autoCapitalize="none" value={pkg} onChangeText={setPkg} />
      <Button title="Add app" onPress={() => { if (pkg && label) { onAdd(pkg.trim(), label.trim()); setPkg(''); setLabel(''); } }} />
    </View>
  );
}

function AddPlace({ onAdd }: { onAdd: (label: string, lat: number, lng: number, radius: number) => void }) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('150');
  return (
    <View style={{ marginTop: 10 }}>
      <TextInput style={styles.input} placeholder="Name (e.g. School)" placeholderTextColor={theme.dim} value={label} onChangeText={setLabel} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Latitude" placeholderTextColor={theme.dim} keyboardType="numbers-and-punctuation" value={lat} onChangeText={setLat} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Longitude" placeholderTextColor={theme.dim} keyboardType="numbers-and-punctuation" value={lng} onChangeText={setLng} />
      </View>
      <TextInput style={styles.input} placeholder="Radius in metres" placeholderTextColor={theme.dim} keyboardType="number-pad" value={radius} onChangeText={setRadius} />
      <Button title="Add place" onPress={() => {
        const la = Number(lat), ln = Number(lng), r = Number(radius) || 150;
        if (label && !Number.isNaN(la) && !Number.isNaN(ln)) { onAdd(label.trim(), la, ln, r); setLabel(''); setLat(''); setLng(''); }
      }} />
    </View>
  );
}

function ScreenTime({ settings, onSave }: { settings: ChildSettings | null; onSave: (m: number | null) => void }) {
  const [mins, setMins] = useState(settings?.screen_time_minutes ? String(settings.screen_time_minutes) : '');
  useEffect(() => { setMins(settings?.screen_time_minutes ? String(settings.screen_time_minutes) : ''); }, [settings]);
  return (
    <View>
      <Dim>Daily limit in minutes. Leave empty for no limit.</Dim>
      <TextInput style={styles.input} placeholder="e.g. 120" placeholderTextColor={theme.dim} keyboardType="number-pad" value={mins} onChangeText={setMins} />
      <Button title="Save limit" onPress={() => onSave(mins ? Math.max(0, Math.min(1440, Number(mins))) : null)} />
    </View>
  );
}

function confirmRemoveDevice(deviceId: string, reload: () => void) {
  RNAlert.alert('Remove device', 'The phone will stop reporting. You can enrol it again later.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await guard.removeDevice(deviceId); reload(); } },
  ]);
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomColor: theme.line, borderBottomWidth: 1 },
  input: { backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 10, padding: 12, marginTop: 8, fontSize: 15 },
  tokenBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, marginTop: 10 },
});
