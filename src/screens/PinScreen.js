import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, SafeAreaView, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORS, PIN, PIN_LENGTH, MAX_PIN_ATTEMPTS, LOCKOUT_STEPS_MS,
} from '../constants';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const FAIL_KEY = 'pinFailures';
const LOCK_COUNT_KEY = 'pinLockCount';
const LOCKED_UNTIL_KEY = 'pinLockedUntil';

function lockoutFor(lockCount) {
  return LOCKOUT_STEPS_MS[Math.min(lockCount, LOCKOUT_STEPS_MS.length - 1)];
}

function formatWait(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export default function PinScreen({ onUnlock }) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockCount, setLockCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const checkingRef = useRef(false);

  // Throttle state is persisted: otherwise force-quitting the app resets the
  // failure counter and the lockout is worthless.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([FAIL_KEY, LOCK_COUNT_KEY, LOCKED_UNTIL_KEY]);
        if (cancelled) return;
        const map = Object.fromEntries((pairs || []).filter(Boolean));
        setFailures(parseInt(map[FAIL_KEY], 10) || 0);
        setLockCount(parseInt(map[LOCK_COUNT_KEY], 10) || 0);
        setLockedUntil(parseInt(map[LOCKED_UNTIL_KEY], 10) || 0);
      } catch {
        // Storage unavailable — fall back to in-memory throttling.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Tick only while locked so the countdown updates without a permanent timer.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remaining = Math.max(0, lockedUntil - now);
  const locked = remaining > 0;

  const persist = useCallback((f, c, u) => {
    AsyncStorage.multiSet([
      [FAIL_KEY, String(f)],
      [LOCK_COUNT_KEY, String(c)],
      [LOCKED_UNTIL_KEY, String(u)],
    ]).catch(() => {});
  }, []);

  function registerFailure() {
    Vibration.vibrate(400);
    setError(true);

    const nextFailures = failures + 1;
    setFailures(nextFailures);

    if (nextFailures >= MAX_PIN_ATTEMPTS) {
      const nextLockCount = lockCount + 1;
      const until = Date.now() + lockoutFor(nextLockCount);
      setLockCount(nextLockCount);
      setLockedUntil(until);
      setNow(Date.now());
      persist(0, nextLockCount, until);
    } else {
      persist(nextFailures, lockCount, lockedUntil);
    }

    setTimeout(() => { setEntry(''); setError(false); }, 800);
  }

  function press(key) {
    if (key === '' || locked || checkingRef.current) return;

    if (key === '⌫') {
      setEntry(e => e.slice(0, -1));
      setError(false);
      return;
    }

    if (entry.length >= PIN_LENGTH) return;
    const next = entry + key;
    setEntry(next);

    if (next.length === PIN_LENGTH) {
      checkingRef.current = true;
      setTimeout(() => {
        if (next === PIN) {
          persist(0, 0, 0); // successful unlock clears the throttle history
          onUnlock();
        } else {
          registerFailure();
        }
        checkingRef.current = false;
      }, 150);
    }
  }

  const attemptsLeft = Math.max(0, MAX_PIN_ATTEMPTS - failures);

  function hintText() {
    if (locked) return `Too many attempts. Try again in ${formatWait(remaining)}`;
    if (error) return `Wrong PIN — ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`;
    if (failures > 0) return `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before a lockout`;
    return ' ';
  }

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Family Budget</Text>
      <Text style={styles.sub}>Enter your PIN to continue</Text>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[
            styles.dot,
            i < entry.length && (error ? styles.dotError : styles.dotFilled),
          ]} />
        ))}
      </View>

      <Text style={[styles.errorMsg, locked && styles.lockMsg]}>{hintText()}</Text>

      <View style={styles.pad}>
        {KEYS.map((k, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, k === '' && styles.keyEmpty, locked && styles.keyDisabled]}
            onPress={() => press(k)}
            activeOpacity={0.6}
            disabled={k === '' || locked}
            accessibilityRole="button"
            accessibilityLabel={k === '⌫' ? 'Delete' : `Digit ${k}`}
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
  logo: { width: 80, height: 80, borderRadius: 18, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 14, color: COLORS.text3, marginBottom: 40 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotError: { backgroundColor: COLORS.wants, borderColor: COLORS.wants },
  errorMsg: { fontSize: 13, color: COLORS.wants, marginBottom: 28, height: 20, textAlign: 'center' },
  lockMsg: { color: COLORS.warn, fontWeight: '600' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 12 },
  key: { width: 82, height: 68, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontSize: 22, fontWeight: '500', color: COLORS.text },
  keyDel: { fontSize: 18, color: COLORS.text2 },
});
