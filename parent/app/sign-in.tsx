import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert as RNAlert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, H1, P, Button, theme, Dim } from '../components/ui';

// Parents sign in with the SAME account they use for Family Tutor. Both apps
// share one database, so one login covers both.
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return RNAlert.alert('Sign in failed', error.message);
    router.replace('/');
  }

  return (
    <View style={styles.wrap}>
      <Card>
        <H1>Welcome back</H1>
        <P>Sign in with your Family Tutor account.</P>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.dim}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.dim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={signIn} />
        <View style={{ height: 8 }} />
        <Dim>One account runs both Family Tutor and Family Guard.</Dim>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.bg },
  input: {
    backgroundColor: theme.cardAlt,
    color: theme.text,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    fontSize: 15,
  },
});
