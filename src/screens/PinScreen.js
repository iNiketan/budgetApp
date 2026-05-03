import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, SafeAreaView,
} from 'react-native';
import { COLORS, PIN } from '../constants';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinScreen({ onUnlock }) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  function press(key) {
    if (key === '') return;
    if (key === '⌫') {
      setEntry(e => e.slice(0, -1));
      setError(false);
      return;
    }
    if (entry.length >= 4) return;
    const next = entry + key;
    setEntry(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN) {
          onUnlock();
        } else {
          Vibration.vibrate(400);
          setError(true);
          setTimeout(() => { setEntry(''); setError(false); }, 800);
        }
      }, 150);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>💰</Text>
      <Text style={styles.title}>Family Budget</Text>
      <Text style={styles.sub}>Enter your PIN to continue</Text>

      <View style={styles.dots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[
            styles.dot,
            i < entry.length && (error ? styles.dotError : styles.dotFilled),
          ]} />
        ))}
      </View>

      {error ? <Text style={styles.errorMsg}>Wrong PIN, try again</Text> : <Text style={styles.errorMsg}> </Text>}

      <View style={styles.pad}>
        {KEYS.map((k, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, k === '' && styles.keyEmpty]}
            onPress={() => press(k)}
            activeOpacity={0.6}
            disabled={k === ''}
          >
            <Text style={[styles.keyText, k === '⌫' && styles.keyDel]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 14, color: COLORS.text3, marginBottom: 40 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotError: { backgroundColor: COLORS.wants, borderColor: COLORS.wants },
  errorMsg: { fontSize: 13, color: COLORS.wants, marginBottom: 28, height: 20 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 12 },
  key: { width: 82, height: 68, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 22, fontWeight: '500', color: COLORS.text },
  keyDel: { fontSize: 18, color: COLORS.text2 },
});
