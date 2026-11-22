import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, Alert as RNAlert } from 'react-native';
import { router } from 'expo-router';
import { saveToken, getToken } from '../lib/token';
import { api } from '../lib/api';
import { native } from '../lib/native';
import { Card, H1, P, Dim, Button, theme } from '../components/ui';

// A parent enrols this phone in the parent app and reads out the one-time
// code. The child types it here. The code is exchanged for a device identity
// on the first config call; it is then kept in the secure store.
export default function Enrol() {
  const [code, setCode] = useState('');
  const [owner, setOwner] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    native.isDeviceOwner().then(setOwner);
  }, []);

  async function enrol() {
    const token = code.trim();
    if (token.length < 32) return RNAlert.alert('Check the code', 'That code looks too short.');
    setBusy(true);
    await saveToken(token);
    try {
      await api.getConfig(); // verifies the token against the API
      router.replace('/launcher');
    } catch {
      setBusy(false);
      RNAlert.alert('Could not enrol', 'The code was not accepted. Ask your parent to read it again.');
    }
  }

  return (
    <View style={styles.wrap}>
      <Card>
        <H1>Set up this phone</H1>
        <P>Ask a parent to add this phone in Family Guard and read you the code.</P>
        <TextInput
          style={styles.input}
          placeholder="Enrolment code"
          placeholderTextColor={theme.dim}
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />
        <Button title={busy ? 'Setting up…' : 'Set up'} onPress={enrol} />
        <View style={{ height: 10 }} />
        <Dim>
          {owner
            ? 'This phone is in device-owner mode: full protection is available.'
            : 'Tip: for full protection, set Family Guard as device owner during first setup (see the install guide).'}
        </Dim>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.bg },
  input: { backgroundColor: theme.cardAlt, color: theme.text, borderRadius: 12, padding: 14, marginTop: 10, fontSize: 15 },
});
