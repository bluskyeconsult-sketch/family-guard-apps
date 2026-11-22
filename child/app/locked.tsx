import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { router } from 'expo-router';
import { applyPolicy } from '../lib/reporters';
import { H1, P, theme } from '../components/ui';

// Shown when a parent has pressed hard stop. Checks the policy regularly and
// returns to the launcher the moment the parent unlocks.
export default function Locked() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function check() {
    const p = await applyPolicy();
    if (!p || !p.hard_stop.enabled || !p.hard_stop.locked) router.replace('/launcher');
  }

  useEffect(() => {
    check();
    timer.current = setInterval(check, 20000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { if (timer.current) clearInterval(timer.current); sub.remove(); };
  }, []);

  return (
    <View style={styles.wrap}>
      <H1>Paused</H1>
      <P style={{ textAlign: 'center', marginTop: 8 }}>
        A parent has paused this phone for now. It will come back on shortly.
      </P>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.bg },
});
