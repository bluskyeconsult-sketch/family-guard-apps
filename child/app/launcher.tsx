import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, AppState } from 'react-native';
import { router } from 'expo-router';
import { tick } from '../lib/reporters';
import { native } from '../lib/native';
import type { Policy } from '../lib/api';
import { H1, H2, P, Dim, theme } from '../components/ui';

// The child home screen. Shows only approved apps. Set as the system HOME via
// device owner, so it is where the phone always returns. Refreshes policy on
// focus and every few minutes while open.
const REFRESH_MS = 3 * 60 * 1000;

export default function Launcher() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const p = await tick();
    if (p) {
      setPolicy(p);
      if (p.hard_stop.enabled && p.hard_stop.locked) router.replace('/locked');
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      if (timer.current) clearInterval(timer.current);
      sub.remove();
    };
  }, [refresh]);

  const apps = policy?.approved_apps ?? [];

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.wrap}>
      <H1>Home</H1>
      <Dim>Your apps</Dim>
      <View style={styles.grid}>
        {apps.map((a) => (
          <Pressable key={a.package} style={styles.tile} onPress={() => native.launchApp(a.package)}>
            <View style={styles.icon}>
              <P style={{ fontSize: 22 }}>{(a.label ?? a.package).slice(0, 1).toUpperCase()}</P>
            </View>
            <Dim>{a.label ?? a.package}</Dim>
          </Pressable>
        ))}
        {policy?.features.messenger ? (
          <Pressable style={styles.tile} onPress={() => router.push('/messenger')}>
            <View style={[styles.icon, { backgroundColor: theme.accent }]}>
              <P style={{ fontSize: 22 }}>💬</P>
            </View>
            <Dim>Family</Dim>
          </Pressable>
        ) : null}
      </View>

      {apps.length === 0 ? (
        <View style={{ marginTop: 20 }}>
          <H2>Waiting for your apps</H2>
          <Dim>A parent is setting this up. Pull down in a moment.</Dim>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 },
  tile: { width: 84, alignItems: 'center' },
  icon: { width: 64, height: 64, borderRadius: 18, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
