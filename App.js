import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PinScreen from './src/screens/PinScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import { fetchExpenses } from './src/api';
import { COLORS } from './src/constants';

const Tab = createBottomTabNavigator();

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncText, setSyncText] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses();
      setExpenses(data);
      setSyncText('Synced · ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setSyncText('Could not sync — offline?');
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
    setExpenses(prev => [...prev, {
      date: entry.date,
      desc: entry.description,
      cat: entry.cat,
      subcat: entry.subcategory,
      amount: entry.amount,
      who: entry.paidBy,
      month: entry.month,
      year: entry.year,
    }]);
  }

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.syncBar}>
        {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginRight: 6 }} />}
        <View style={[styles.syncDot, { backgroundColor: loading ? '#E9A23B' : COLORS.accent }]} />
        <Text style={styles.syncText}>{loading ? 'Syncing…' : syncText}</Text>
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
  syncText: { fontSize: 12, color: COLORS.text3 },
  tabBar: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, height: 60, paddingBottom: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
