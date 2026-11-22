import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { getToken } from '../lib/token';
import { applyPolicy } from '../lib/reporters';
import { theme } from '../components/ui';

async function ensureLocationPermission(): Promise<void> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.granted) await Location.requestBackgroundPermissionsAsync();
  } catch {
    /* the native service also guards against missing permission */
  }
}

// Entry gate: no token -> enrol; locked by parent -> locked screen; else the
// launcher. Runs once at start; the launcher keeps policy fresh after that.
export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/enrol');
        return;
      }
      await ensureLocationPermission();
      const policy = await applyPolicy();
      if (policy?.hard_stop.enabled && policy.hard_stop.locked) {
        router.replace('/locked');
      } else {
        router.replace('/launcher');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  return null;
}
