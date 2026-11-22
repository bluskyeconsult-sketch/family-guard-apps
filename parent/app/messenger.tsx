import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, TextInput, Pressable, StyleSheet } from 'react-native';
import * as guard from '../lib/guard';
import type { Learner } from '../lib/types';
import { Card, H2, P, Dim, Button, theme } from '../components/ui';

// Family-only text messages. A parent picks one child and a thread links just
// the two of them. No media, paged history.
export default function Messenger() {
  const [fam, setFam] = useState('');
  const [children, setChildren] = useState<Learner[]>([]);
  const [threads, setThreads] = useState<{ id: string; title: string | null; updated_at: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_kind: string; body: string; created_at: string }[]>([]);
  const [text, setText] = useState('');

  const loadBase = useCallback(async () => {
    const f = await guard.familyId();
    setFam(f ?? '');
    setChildren(await guard.listChildren());
    setThreads(await guard.listThreads());
  }, []);
  useEffect(() => { loadBase(); }, [loadBase]);

  async function openThread(id: string) {
    setActive(id);
    setMessages((await guard.fetchMessages(id)).reverse());
  }

  async function startWith(child: Learner) {
    const id = await guard.createDirectThread(fam, child.id, `${child.display_name}`);
    await loadBase();
    await openThread(id);
  }

  async function send() {
    if (!active || !text.trim()) return;
    await guard.sendMessage(active, fam, text.trim());
    setText('');
    setMessages((await guard.fetchMessages(active)).reverse());
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      {!active ? (
        <>
          <Card>
            <H2>Start a chat</H2>
            {children.map((c) => (
              <Pressable key={c.id} onPress={() => startWith(c)} style={styles.row}>
                <P>{c.display_name}</P>
                <Dim>New chat</Dim>
              </Pressable>
            ))}
          </Card>
          <Card>
            <H2>Conversations</H2>
            {threads.length === 0 ? <Dim>No conversations yet.</Dim> : null}
            {threads.map((t) => (
              <Pressable key={t.id} onPress={() => openThread(t.id)} style={styles.row}>
                <P>{t.title ?? 'Chat'}</P>
                <Dim>{new Date(t.updated_at).toLocaleDateString()}</Dim>
              </Pressable>
            ))}
          </Card>
        </>
      ) : (
        <>
          <Pressable onPress={() => setActive(null)}><Dim>← All chats</Dim></Pressable>
          <View style={{ height: 10 }} />
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.sender_kind === 'parent' ? styles.mine : styles.theirs]}>
              <P>{m.body}</P>
              <Dim>{new Date(m.created_at).toLocaleTimeString()}</Dim>
            </View>
          ))}
          <View style={styles.composer}>
            <TextInput style={styles.input} placeholder="Message" placeholderTextColor={theme.dim} value={text} onChangeText={setText} />
            <Button title="Send" onPress={send} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomColor: theme.line, borderBottomWidth: 1 },
  bubble: { borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: '85%' },
  mine: { backgroundColor: theme.accent, alignSelf: 'flex-end' },
  theirs: { backgroundColor: theme.cardAlt, alignSelf: 'flex-start' },
  composer: { marginTop: 10 },
  input: { backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 10, padding: 12, fontSize: 15 },
});
