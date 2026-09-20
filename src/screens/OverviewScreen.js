import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, MONTHS } from '../constants';
import {
  fmt, summarize, monthOf, savingsFromIncome, savingsBarPct, trailingTrend, breakdown as breakdownOf,
} from '../summary';

const DONUT_SIZE = 130;
const DONUT_STROKE = 18;

/**
 * Proportional donut. The previous version stacked three full rings and set
 * `opacity` on each, which blended the colours instead of drawing arcs — the
 * ring looked the same regardless of the actual split.
 */
function DonutChart({ needs, wants, savings, allocated }) {
  const r = (DONUT_SIZE - DONUT_STROKE) / 2;
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;
  const circumference = 2 * Math.PI * r;

  const slices = [
    { key: 'needs', v: needs, color: COLORS.needs },
    { key: 'wants', v: wants, color: COLORS.wants },
    { key: 'savings', v: savings, color: COLORS.savings },
  ].filter(s => s.v > 0);

  let acc = 0;
  const arcs = slices.map(s => {
    const frac = allocated > 0 ? s.v / allocated : 0;
    const arc = { ...s, dash: frac * circumference, offset: acc * circumference };
    acc += frac;
    return arc;
  });

  return (
    <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle cx={cx} cy={cy} r={r} stroke="#E8E5DE" strokeWidth={DONUT_STROKE} fill="none" />
          {arcs.map(a => (
            <Circle
              key={a.key}
              cx={cx} cy={cy} r={r}
              stroke={a.color}
              strokeWidth={DONUT_STROKE}
              fill="none"
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutTotal}>{fmt(allocated)}</Text>
        <Text style={styles.donutLbl}>tracked</Text>
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
  const thisMonth = monthOf(expenses, now.getMonth(), now.getFullYear());
  const { needs, wants, savings, allocated, spent } = summarize(thisMonth);

  // `saved` is income minus real spending. Savings-category entries are money
  // you kept, so they must not be subtracted here.
  const { saved, pct: savedPct } = savingsFromIncome(income, spent);
  const barPct = savingsBarPct(savedPct);
  const inc = Number(income) || 0;
  const overspent = inc > 0 && saved < 0;

  const trendMonths = trailingTrend(expenses, now).map(m => ({
    label: MONTHS[m.month].slice(0, 3),
    total: m.total,
    isCurrent: m.isCurrent,
  }));
  const maxTrend = Math.max(...trendMonths.map(m => m.total), 1);

  const breakdown = breakdownOf(thisMonth, 5);
  const maxBreak = Math.max(...breakdown.map(e => e[1]), 1);

  function heroSubText() {
    if (inc <= 0) return 'Enter income above to see %';
    if (overspent) return `Over income by ${fmt(-saved)} · target is 20%`;
    return `${savedPct}% of income · target is 20%`;
  }

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
      <View style={[styles.savingsHero, overspent && styles.savingsHeroOver]}>
        <Text style={styles.savingsHeroLabel}>
          {overspent ? 'OVERSPENT THIS MONTH' : 'SAVED THIS MONTH'}
        </Text>
        <Text style={styles.savingsHeroAmt}>{fmt(saved)}</Text>
        <Text style={styles.savingsHeroSub}>{heroSubText()}</Text>
        <View style={styles.savingsBar}>
          <View style={[styles.savingsBarFill, { width: `${barPct}%` }]} />
        </View>
      </View>

      {/* Donut */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>THIS MONTH'S ALLOCATION</Text>
        <View style={styles.donutWrap}>
          <DonutChart needs={needs} wants={wants} savings={savings} allocated={allocated} />
          <View style={styles.donutLegend}>
            {[
              { label: 'Needs', v: needs, c: COLORS.needs },
              { label: 'Wants', v: wants, c: COLORS.wants },
              { label: 'Savings', v: savings, c: COLORS.savings },
            ].map(s => (
              <View key={s.label} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: s.c }]} />
                  <Text style={styles.legendLabel}>{s.label}</Text>
                </View>
                <Text style={styles.legendPct}>{allocated > 0 ? Math.round(s.v / allocated * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.donutFootNote}>
          Spending this month: {fmt(spent)}
        </Text>
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
  savingsHeroOver: { backgroundColor: COLORS.wants },
  savingsHeroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, marginBottom: 6 },
  savingsHeroAmt: { fontSize: 32, fontWeight: '700', color: 'white', marginBottom: 3 },
  savingsHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  savingsBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  savingsBarFill: { height: 5, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 3 },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  donutLbl: { fontSize: 10, color: COLORS.text3, textAlign: 'center' },
  donutFootNote: { fontSize: 11, color: COLORS.text3, marginTop: 12 },
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
