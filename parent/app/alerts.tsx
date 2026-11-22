import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import * as guard from '../lib/guard';
import type { Alert } from '../lib/types';
import { Card, H2, P, Dim, Badge, theme } from '../components/ui';

export default function Alerts() {
  const [items, setItems] = useState<Alert[]>([]);
  const load = useCallback(async () => setItems(await guard.listAlerts(false)), []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      {items.length === 0 ? <Card><P>No alerts. All calm.</P></Card> : null}
      {items.map((a) => (
        <Card key={a.id} style={{ opacity: a.acknowledged_at ? 0.55 : 1 }}>
          <View style={styles.row}>
            <H2>{a.title}</H2>
            <Badge text={a.severity} tone={a.severity === 'high' ? 'high' : a.severity === 'warn' ? 'warn' : 'good'} />
          </View>
          {a.body ? <P>{a.body}</P> : null}
          <Dim>{new Date(a.created_at).toLocaleString()}</Dim>
          {!a.acknowledged_at ? (
            <Pressable onPress={async () => { await guard.acknowledgeAlert(a.id); await load(); }} style={styles.ack}>
              <P style={{ fontWeight: '600' }}>Mark seen</P>
            </Pressable>
          ) : (
            <Dim>Seen</Dim>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ack: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 8 },
});
