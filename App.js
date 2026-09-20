import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PinScreen from './src/screens/PinScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import { fetchExpenses } from './src/api';
import { COLORS, CONFIG_PROBLEMS } from './src/constants';

const Tab = createBottomTabNavigator();

// How many consecutive polls a locally-added entry may stay missing from the
// sheet before we stop showing it. Sheets has read-after-write lag, but if an
// entry hasn't appeared after ~3 minutes it never landed, and showing it would
// silently overstate what's actually recorded.
const MAX_PENDING_MISSES = 3;

function sameEntry(a, b) {
  return a.date === b.date
    && a.amount === b.amount
    && a.desc === b.desc
    && a.subcat === b.subcat
    && a.who === b.who;
}

function ConfigErrorScreen() {
  return (
    <SafeAreaProvider>
      <ScrollView contentContainerStyle={styles.configWrap}>
        <Text style={styles.configIcon}>⚠️</Text>
        <Text style={styles.configTitle}>Configuration problem</Text>
        <Text style={styles.configBody}>
          This build is missing required settings and cannot talk to the sheet.
        </Text>
        {CONFIG_PROBLEMS.map(p => (
          <Text key={p} style={styles.configItem}>• {p}</Text>
        ))}
        <Text style={styles.configHint}>
          Copy .env.example to .env, fill in the values, then rebuild.
        </Text>
      </ScrollView>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [syncOk, setSyncOk] = useState(true);

  // Entries added on this device that the sheet hasn't returned yet.
  const pendingRef = useRef([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses();

      const stillPending = [];
      let dropped = 0;
      for (const p of pendingRef.current) {
        if (data.some(d => sameEntry(d, p))) continue; // confirmed by the sheet
        p.misses = (p.misses || 0) + 1;
        if (p.misses > MAX_PENDING_MISSES) { dropped++; continue; }
        stillPending.push(p);
      }
      pendingRef.current = stillPending;

      setExpenses([...data, ...stillPending]);
      setSyncOk(true);
      setSyncText(
        (dropped ? `${dropped} expense(s) never reached the sheet · ` : '')
        + 'Synced · ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (err) {
      setSyncOk(false);
      setSyncText((err && err.message) || 'Could not sync.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadData();
      const interval = setInterval(loadData, 60000);
      return () => clearInterval(interval);
    }
  }, [unlocked, loadData]);

  function handleAdd(entry) {
    const normalized = {
      date: entry.date,
      desc: entry.description,
      cat: entry.cat,
      subcat: entry.subcategory,
      amount: entry.amount,
      who: entry.paidBy,
      month: entry.month,
      year: entry.year,
      misses: 0,
    };
    pendingRef.current.push(normalized);
    setExpenses(prev => [...prev, normalized]);
  }

  if (CONFIG_PROBLEMS.length) return <ConfigErrorScreen />;

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.syncBar}>
        {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginRight: 6 }} />}
        <View style={[styles.syncDot, { backgroundColor: loading ? '#E9A23B' : (syncOk ? COLORS.accent : COLORS.wants) }]} />
        <Text style={styles.syncText} numberOfLines={1}>{loading ? 'Syncing…' : syncText}</Text>
      </View>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.text3,
            tabBarLabelStyle: styles.tabLabel,
            tabBarIcon: () => (
              <Text style={{ fontSize: 20 }}>
                {route.name === 'Expenses' ? '📋' : '📊'}
              </Text>
            ),
          })}
        >
          <Tab.Screen name="Expenses">
            {() => <ExpensesScreen expenses={expenses} onRefresh={loadData} onAdd={handleAdd} />}
          </Tab.Screen>
          <Tab.Screen name="Overview">
            {() => <OverviewScreen expenses={expenses} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  syncBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 12, color: COLORS.text3, flex: 1 },
  tabBar: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, height: 60, paddingBottom: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  configWrap: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: COLORS.bg },
  configIcon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  configTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  configBody: { fontSize: 14, color: COLORS.text2, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  configItem: { fontSize: 13, color: COLORS.wants, marginBottom: 6, lineHeight: 19 },
  configHint: { fontSize: 12, color: COLORS.text3, marginTop: 18, textAlign: 'center' },
});
