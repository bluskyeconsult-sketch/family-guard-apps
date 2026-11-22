import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Switch, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import * as guard from '../lib/guard';
import type { FeatureKey } from '../lib/types';
import { Card, H2, P, Dim, Button, theme } from '../components/ui';

const EXTRAS: { key: FeatureKey; label: string; note: string }[] = [
  { key: 'messenger', label: 'Family messenger', note: 'Text chats between you and the children.' },
  { key: 'safety_alerts', label: 'Message safety alerts', note: 'Flags a concerning incoming message.' },
  { key: 'insights', label: 'Insights charts', note: 'Screen-time charts on each child.' },
  { key: 'weekly_digest', label: 'Weekly digest', note: 'A weekly summary of the week.' },
  { key: 'hard_stop', label: 'Hard stop', note: 'The button that locks a phone now.' },
];

export default function Settings() {
  const [fam, setFam] = useState('');
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [dns, setDns] = useState('family.cloudflare-dns.com');

  const load = useCallback(async () => {
    const f = await guard.familyId();
    setFam(f ?? '');
    if (f) {
      setFeatures(await guard.getFeatures(f));
      setDns(await guard.getDnsHost(f));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <H2>Content filter DNS</H2>
        <Dim>The Private DNS hostname the child phones enforce. Default blocks adult content and never blocks YouTube.</Dim>
        <TextInput style={styles.input} autoCapitalize="none" value={dns} onChangeText={setDns} placeholderTextColor={theme.dim} />
        <Button title="Save DNS host" onPress={async () => { await guard.setDnsHost(fam, dns.trim()); }} />
      </Card>

      <Card>
        <H2>Extras</H2>
        <Dim>Turn any extra off. The core — location, places, filter, screen time, launcher — always stays on.</Dim>
        {EXTRAS.map((e) => (
          <View key={e.key} style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <P>{e.label}</P>
              <Dim>{e.note}</Dim>
            </View>
            <Switch
              value={features[e.key] !== false}
              onValueChange={async (v) => {
                setFeatures((f) => ({ ...f, [e.key]: v }));
                await guard.setFeature(fam, e.key, v);
              }}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Button title="Sign out" kind="ghost" onPress={async () => { await supabase.auth.signOut(); router.replace('/'); }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomColor: theme.line, borderBottomWidth: 1 },
  input: { backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 10, padding: 12, marginTop: 8, fontSize: 15 },
});
