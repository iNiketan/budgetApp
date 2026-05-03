import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, MONTHS } from '../constants';

const W = Dimensions.get('window').width;

function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

function DonutChart({ needs, wants, sav, total }) {
  const size = 130, cx = size / 2, cy = size / 2, r = 48, lw = 18;
  const slices = [
    { v: needs, color: COLORS.needs },
    { v: wants, color: COLORS.wants },
    { v: sav, color: COLORS.savings },
  ].filter(s => s.v > 0);

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: r * 2, height: r * 2, borderRadius: r, borderWidth: lw, borderColor: '#E8E5DE' }} />
        <View style={{ position: 'absolute' }}>
          <Text style={styles.donutTotal}>₹0</Text>
          <Text style={styles.donutLbl}>spent</Text>
        </View>
      </View>
    );
  }

  // Use SVG-like approach with multiple arcs via View transforms
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: r * 2 + lw, height: r * 2 + lw, borderRadius: r + lw / 2, overflow: 'hidden', position: 'relative' }}>
        {slices.map((s, i) => {
          const pct = s.v / total;
          return (
            <View key={i} style={{
              position: 'absolute', inset: 0,
              borderWidth: lw, borderColor: s.color,
              borderRadius: r + lw / 2,
              opacity: pct,
            }} />
          );
        })}
      </View>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={styles.donutTotal}>{fmt(total)}</Text>
        <Text style={styles.donutLbl}>spent</Text>
      </View>
    </View>
  );
}

export default function OverviewScreen({ expenses }) {
  const [income, setIncome] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('salary').then(v => { if (v) setIncome(v); });
  }, []);

  function handleIncomeChange(v) {
    setIncome(v);
    AsyncStorage.setItem('salary', v);
  }

  const now = new Date();
  const thisMonth = expenses.filter(e => e.month === now.getMonth() && e.year === now.getFullYear());
  let needs = 0, wants = 0, sav = 0;
  thisMonth.forEach(e => {
    if (e.cat === 'needs') needs += e.amount;
    else if (e.cat === 'wants') wants += e.amount;
    else sav += e.amount;
  });
  const total = needs + wants + sav;
  const inc = parseFloat(income) || 0;
  const saved = inc > 0 ? Math.max(0, inc - total) : 0;
  const savedPct = inc > 0 ? Math.round((saved / inc) * 100) : 0;
  const savingsBarWidth = Math.min(savedPct / 20 * 100, 100);

  // 6 month trend
  const trendMonths = [];
  for (let i = 5; i >= 0; i--) {
    let m = now.getMonth() - i, y = now.getFullYear();
    if (m < 0) { m += 12; y--; }
    const t = expenses.filter(e => e.month === m && e.year === y).reduce((s, e) => s + e.amount, 0);
    trendMonths.push({ label: MONTHS[m].slice(0, 3), total: t, isCurrent: i === 0 });
  }
  const maxTrend = Math.max(...trendMonths.map(m => m.total), 1);

  // Category breakdown
  const sub = {};
  thisMonth.forEach(e => {
    const key = e.subcat || (e.cat === 'needs' ? 'Other needs' : e.cat === 'wants' ? 'Other wants' : 'Other savings');
    sub[key] = (sub[key] || 0) + e.amount;
  });
  const breakdown = Object.entries(sub).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBreak = Math.max(...breakdown.map(e => e[1]), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

      {/* Salary card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>MONTHLY INCOME (COMBINED)</Text>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeSym}>₹</Text>
          <TextInput
            style={styles.incomeInput}
            keyboardType="numeric"
            placeholder="e.g. 150000"
            placeholderTextColor={COLORS.text3}
            value={income}
            onChangeText={handleIncomeChange}
          />
          <Text style={styles.incomeLabel}>/month</Text>
        </View>
        {inc > 0 && (
          <Text style={styles.budgetHint}>
            50% Needs: {fmt(inc * 0.5)}  ·  30% Wants: {fmt(inc * 0.3)}  ·  20% Savings: {fmt(inc * 0.2)}
          </Text>
        )}
      </View>

      {/* Savings hero */}
      <View style={styles.savingsHero}>
        <Text style={styles.savingsHeroLabel}>SAVED THIS MONTH</Text>
        <Text style={styles.savingsHeroAmt}>{fmt(saved)}</Text>
        <Text style={styles.savingsHeroSub}>
          {inc > 0 ? `${savedPct}% of income · target is 20%` : 'Enter income above to see %'}
        </Text>
        <View style={styles.savingsBar}>
          <View style={[styles.savingsBarFill, { width: `${savingsBarWidth}%` }]} />
        </View>
      </View>

      {/* Donut */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>THIS MONTH'S SPEND</Text>
        <View style={styles.donutWrap}>
          <DonutChart needs={needs} wants={wants} sav={sav} total={total} />
          <View style={styles.donutLegend}>
            {[
              { label: 'Needs', v: needs, c: COLORS.needs },
              { label: 'Wants', v: wants, c: COLORS.wants },
              { label: 'Savings', v: sav, c: COLORS.savings },
            ].map(s => (
              <View key={s.label} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: s.c }]} />
                  <Text style={styles.legendLabel}>{s.label}</Text>
                </View>
                <Text style={styles.legendPct}>{total > 0 ? Math.round(s.v / total * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Trend */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SPENDING — LAST 6 MONTHS</Text>
        <View style={styles.trendWrap}>
          {trendMonths.map((m, i) => (
            <View key={i} style={styles.trendBarWrap}>
              <Text style={styles.trendAmt}>{m.total > 0 ? `₹${Math.round(m.total / 1000)}k` : ''}</Text>
              <View style={[styles.trendBar, { height: Math.max(Math.round((m.total / maxTrend) * 80), 2), backgroundColor: m.isCurrent ? COLORS.accent : COLORS.needsBg }]} />
              <Text style={styles.trendLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>TOP CATEGORIES</Text>
        {breakdown.length === 0 ? (
          <Text style={styles.emptyText}>Add expenses to see breakdown</Text>
        ) : breakdown.map(([name, val]) => (
          <View key={name} style={styles.breakdownRow}>
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownName}>{name}</Text>
              <Text style={styles.breakdownAmt}>{fmt(val)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.round(val / maxBreak * 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.text3, letterSpacing: 0.8, marginBottom: 12 },
  incomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  incomeSym: { fontSize: 16, color: COLORS.text2 },
  incomeInput: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, padding: 9, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.bg, fontFamily: 'monospace' },
  incomeLabel: { fontSize: 13, color: COLORS.text3 },
  budgetHint: { fontSize: 11, color: COLORS.text3, marginTop: 10, lineHeight: 18 },
  savingsHero: { backgroundColor: COLORS.accent, borderRadius: 16, padding: 18, marginBottom: 12 },
  savingsHeroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, marginBottom: 6 },
  savingsHeroAmt: { fontSize: 32, fontWeight: '700', color: 'white', marginBottom: 3 },
  savingsHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  savingsBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  savingsBarFill: { height: 5, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 3 },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutTotal: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  donutLbl: { fontSize: 10, color: COLORS.text3, textAlign: 'center' },
  donutLegend: { flex: 1 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 13, color: COLORS.text },
  legendPct: { fontSize: 12, color: COLORS.text3, fontFamily: 'monospace' },
  trendWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 },
  trendBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendBar: { width: '100%', borderRadius: 4 },
  trendAmt: { fontSize: 9, color: COLORS.text2 },
  trendLabel: { fontSize: 10, color: COLORS.text3 },
  breakdownRow: { marginBottom: 10 },
  breakdownInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakdownName: { fontSize: 13, color: COLORS.text },
  breakdownAmt: { fontSize: 12, color: COLORS.text2, fontFamily: 'monospace' },
  progressBar: { height: 5, backgroundColor: COLORS.surface2, borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: COLORS.accent, borderRadius: 3 },
  emptyText: { fontSize: 13, color: COLORS.text3 },
});
