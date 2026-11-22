import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import * as guard from '../lib/guard';
import type { Learner } from '../lib/types';
import { Card, H1, H2, P, Dim, Button, Badge, theme } from '../components/ui';

interface Row {
  child: Learner;
  deviceCount: number;
  lastSeen: string | null;
  battery: number | null;
  dnsOk: boolean | null;
  vpn: boolean | null;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [unack, setUnack] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setSignedIn(false);
      setReady(true);
      return;
    }
    setSignedIn(true);
    const children = await guard.listChildren();
    const out: Row[] = [];
    for (const child of children) {
      const [devices, status] = await Promise.all([
        guard.listDevices(child.id),
        guard.deviceStatus(child.id),
      ]);
      const latest = status.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
      out.push({
        child,
        deviceCount: devices.length,
        lastSeen: devices.map((d) => d.last_seen_at).filter(Boolean).sort().reverse()[0] ?? null,
        battery: latest?.battery ?? null,
        dnsOk: latest?.dns_ok ?? null,
        vpn: latest?.vpn_active ?? null,
      });
    }
    setRows(out);
    setUnack((await guard.listAlerts(true)).length);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (ready && !signedIn) {
    return (
      <View style={styles.center}>
        <Card>
          <H1>Family Guard</H1>
          <P>Keep your children safe: location, places, screen time and gentle guard rails.</P>
          <Button title="Sign in" onPress={() => router.push('/sign-in')} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={theme.text}
        />
      }
    >
      <View style={styles.topRow}>
        <H1>Your children</H1>
        <Pressable onPress={() => router.push('/settings')}>
          <Dim>Settings</Dim>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        <QuickLink label={`Alerts${unack ? ` (${unack})` : ''}`} onPress={() => router.push('/alerts')} />
        <QuickLink label="Messages" onPress={() => router.push('/messenger')} />
      </View>

      {rows.length === 0 ? (
        <Card>
          <P>No children yet. Family Guard reads the same children as Family Tutor.</P>
        </Card>
      ) : null}

      {rows.map((r) => (
        <Pressable key={r.child.id} onPress={() => router.push(`/child/${r.child.id}`)}>
          <Card>
            <View style={styles.cardTop}>
              <H2>{r.child.display_name}</H2>
              {r.deviceCount === 0 ? (
                <Badge text="No device" tone="dim" />
              ) : r.vpn ? (
                <Badge text="VPN seen" tone="high" />
              ) : r.dnsOk === false ? (
                <Badge text="Filter off" tone="warn" />
              ) : (
                <Badge text="Protected" tone="good" />
              )}
            </View>
            <Dim>
              {r.deviceCount} device{r.deviceCount === 1 ? '' : 's'}
              {r.battery != null ? ` · battery ${r.battery}%` : ''}
              {r.lastSeen ? ` · seen ${timeAgo(r.lastSeen)}` : ' · not seen yet'}
            </Dim>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function QuickLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <P style={{ fontWeight: '600' }}>{label}</P>
    </Pressable>
  );
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quick: { flex: 1, backgroundColor: theme.cardAlt, borderRadius: 12, padding: 14, alignItems: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
});
