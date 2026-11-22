import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { P, Dim, Button, theme } from '../components/ui';

// Child side of the family messenger. Text only, and only the conversations
// a parent added this child to. Goes through the API, never the database.
export default function Messenger() {
  const [threads, setThreads] = useState<{ thread_id: string; title: string | null }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const loadThreads = useCallback(async () => {
    try {
      const r = await api.listThreads();
      setThreads(r.threads);
    } catch { /* offline */ }
  }, []);
  useEffect(() => { loadThreads(); }, [loadThreads]);

  async function open(id: string) {
    setActive(id);
    const r = await api.fetchMessages(id);
    setMessages(r.messages.slice().reverse());
  }

  async function send() {
    if (!active || !text.trim()) return;
    await api.send(active, text.trim());
    setText('');
    const r = await api.fetchMessages(active);
    setMessages(r.messages.slice().reverse());
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <Pressable onPress={() => (active ? setActive(null) : router.replace('/launcher'))}>
        <Dim>← Back</Dim>
      </Pressable>
      <View style={{ height: 12 }} />
      {!active ? (
        threads.map((t) => (
          <Pressable key={t.thread_id} onPress={() => open(t.thread_id)} style={styles.row}>
            <P>{t.title ?? 'Family'}</P>
          </Pressable>
        ))
      ) : (
        <>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.sender_kind === 'child' ? styles.mine : styles.theirs]}>
              <P>{m.body}</P>
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <TextInput style={styles.input} placeholder="Message" placeholderTextColor={theme.dim} value={text} onChangeText={setText} />
            <Button title="Send" onPress={send} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomColor: theme.line, borderBottomWidth: 1 },
  bubble: { borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: '85%' },
  mine: { backgroundColor: theme.accent, alignSelf: 'flex-end' },
  theirs: { backgroundColor: theme.cardAlt, alignSelf: 'flex-start' },
  input: { backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15 },
});
