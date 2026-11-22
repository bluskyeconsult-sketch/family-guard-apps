// Small shared UI kit: calm, friendly palette for a family safety app.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const theme = {
  bg: '#0f1724',
  card: '#182236',
  cardAlt: '#1f2b42',
  text: '#eaf0fb',
  dim: '#9fb0cc',
  accent: '#4f9cff',
  good: '#36c98d',
  warn: '#ffb020',
  high: '#ff5d5d',
  line: '#26324a',
};

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function P({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.p, style]}>{children}</Text>;
}
export function Dim({ children }: { children: React.ReactNode }) {
  return <Text style={styles.dim}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
}) {
  const bg = kind === 'primary' ? theme.accent : kind === 'danger' ? theme.high : 'transparent';
  const border = kind === 'ghost' ? theme.line : 'transparent';
  const color = kind === 'ghost' ? theme.text : '#06101f';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: kind === 'ghost' ? 1 : 0, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.btnText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ text, tone = 'good' }: { text: string; tone?: 'good' | 'warn' | 'high' | 'dim' }) {
  const bg = tone === 'good' ? theme.good : tone === 'warn' ? theme.warn : tone === 'high' ? theme.high : theme.line;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  h2: { color: theme.text, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  p: { color: theme.text, fontSize: 15, lineHeight: 21 },
  dim: { color: theme.dim, fontSize: 13 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { fontSize: 15, fontWeight: '600' },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { color: '#06101f', fontSize: 12, fontWeight: '700' },
});
