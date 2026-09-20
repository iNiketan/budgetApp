import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView,
} from 'react-native';
import { COLORS, MONTHS, SUBCATS } from '../constants';
import { saveExpense } from '../api';
import { fmt, summarize } from '../summary';

const CAT_ICONS = {
  '🏠 Rent':'🏠','🛒 Groceries':'🛒','⚡ Utilities':'⚡','🚗 Transport':'🚗',
  '💊 Medical':'💊','📱 Phone/Net':'📱','🏫 School fees':'🏫',
  '🍕 Dining out':'🍕','🎬 Movies':'🎬','🛍️ Shopping':'🛍️','✈️ Travel':'✈️',
  '🎮 Games':'🎮','☕ Coffee':'☕','💇 Salon':'💇',
  '📈 SIP / MF':'📈','🏦 FD / RD':'🏦','🚨 Emergency fund':'🚨',
  '🏡 Home goal':'🏡','🎓 Education fund':'🎓',
};

const CAT_META = {
  needs: { label: 'Needs', bg: COLORS.needsBg, fg: COLORS.needs, icon: '🏠', pill: '🏠 Needs' },
  wants: { label: 'Wants', bg: COLORS.wantsBg, fg: COLORS.wants, icon: '🎉', pill: '🎉 Wants' },
  savings: { label: 'Savings', bg: COLORS.savingsBg, fg: COLORS.savings, icon: '💰', pill: '💰 Savings' },
};
const UNKNOWN_CAT = { label: 'Uncategorised', bg: COLORS.surface2, fg: COLORS.text2, icon: '💸', pill: '❔ Other' };

function metaFor(cat) {
  return CAT_META[cat] || UNKNOWN_CAT;
}

function iconFor(e) {
  if (e.subcat && CAT_ICONS[e.subcat]) return CAT_ICONS[e.subcat];
  return metaFor(e.cat).icon;
}

export default function ExpensesScreen({ expenses, onRefresh, onAdd }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [who, setWho] = useState('Me');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Guards against a double-tap firing handleSave twice before React re-renders
  // and disables the button — that logged the same expense twice.
  const savingRef = useRef(false);

  const filtered = expenses.filter(e => e.month === month && e.year === year);
  const { needs, wants, savings, allocated } = summarize(filtered);

  function changeMonth(d) {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  }

  function changeExpenseDay(delta) {
    setExpenseDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      const today = new Date(); today.setHours(23, 59, 59, 999);
      return d > today ? prev : d;
    });
  }

  // Group by day
  const byDay = {};
  [...filtered].sort((a, b) => {
    const pa = a.date.split('/'), pb = b.date.split('/');
    return new Date(pb[2], pb[1]-1, pb[0]) - new Date(pa[2], pa[1]-1, pa[0]);
  }).forEach(e => {
    const d = e.date || '?';
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(e);
  });

  function closeModal() {
    setModal(false);
    resetForm();
  }

  async function handleSave() {
    if (savingRef.current) return;

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Missing amount', 'Enter an amount greater than zero.');
      return;
    }
    if (parsedAmount > 100_000_000) {
      Alert.alert('Invalid amount', 'Amount exceeds the maximum limit (₹10,00,00,000).');
      return;
    }
    if (!cat) {
      Alert.alert('Missing category', 'Pick Needs, Wants or Savings.');
      return;
    }
    if (desc && desc.trim().length > 200) {
      Alert.alert('Description too long', 'Description must be 200 characters or fewer.');
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const d = expenseDate;
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const entry = {
      date: dateStr,
      description: desc || sub || cat,
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      subcategory: sub,
      amount: parsedAmount,
      paidBy: who,
      month: d.getMonth(),
      year: d.getFullYear(),
    };

    try {
      await saveExpense(entry);
      onAdd({
        ...entry,
        desc: entry.description,
        cat,
        subcat: sub,
        who,
        month: d.getMonth(),
        year: d.getFullYear(),
      });
      // Jump to the month we just logged into, so an entry back-dated to a
      // previous month doesn't silently vanish from the current view.
      setMonth(d.getMonth());
      setYear(d.getFullYear());
      closeModal();
    } catch (err) {
      Alert.alert('Could not save', (err && err.message) || 'Check your internet connection.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function resetForm() {
    setAmount(''); setDesc(''); setCat(''); setSub(''); setWho('Me'); setExpenseDate(new Date());
  }

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const isToday = expenseDate.toDateString() === new Date().toDateString();

  return (
    <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)} accessibilityLabel="Previous month">
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)} accessibilityLabel="Next month">
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.totalRow}>
          {/* "Logged", not "spent": this total includes savings contributions,
              which are money moved, not money spent. */}
          <Text style={styles.totalLabel}>TOTAL LOGGED</Text>
          <Text style={styles.totalAmt}>{fmt(allocated)}</Text>
        </View>
        <View style={styles.summary}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.needsBg }]}>
            <Text style={[styles.summaryLabel, { color: COLORS.needs }]}>NEEDS</Text>
            <Text style={[styles.summaryAmt, { color: COLORS.needs }]}>{fmt(needs)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.wantsBg }]}>
            <Text style={[styles.summaryLabel, { color: COLORS.wants }]}>WANTS</Text>
            <Text style={[styles.summaryAmt, { color: COLORS.wants }]}>{fmt(wants)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.savingsBg }]}>
            <Text style={[styles.summaryLabel, { color: COLORS.savings }]}>SAVINGS</Text>
            <Text style={[styles.summaryAmt, { color: COLORS.savings }]}>{fmt(savings)}</Text>
          </View>
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={COLORS.accent} />}
      >
        {Object.keys(byDay).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Tap + Add to log your first expense</Text>
          </View>
        ) : Object.keys(byDay).map(day => (
          <View key={day} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{day}</Text>
            {byDay[day].map((e, i) => {
              const meta = metaFor(e.cat);
              return (
                <View key={i} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: meta.bg }]}>
                    <Text style={{ fontSize: 18 }}>{iconFor(e)}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{e.desc || e.subcat || meta.label}</Text>
                    <Text style={styles.itemMeta}>
                      {meta.label}
                      {e.who !== 'Me' ? `  ·  ${e.who}` : ''}
                      {`  ·  ${e.date}`}
                    </Text>
                  </View>
                  <Text style={[styles.itemAmt, { color: meta.fg }]}>{fmt(e.amount)}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
        <Text style={styles.addBtnText}>+ Add Expense</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Expense</Text>

            {/* The body scrolls: the form is taller than the sheet on a small
                phone, which previously put the Save button out of reach. */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              <Text style={styles.label}>DATE</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateArrowBtn} onPress={() => changeExpenseDay(-1)} accessibilityLabel="Previous day">
                  <Text style={styles.dateArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.dateText}>
                  {isToday
                    ? `Today, ${expenseDate.getDate()} ${MONTHS[expenseDate.getMonth()]}`
                    : `${expenseDate.getDate()} ${MONTHS[expenseDate.getMonth()]} ${expenseDate.getFullYear()}`}
                </Text>
                <TouchableOpacity
                  style={[styles.dateArrowBtn, isToday && styles.dateArrowDisabled]}
                  onPress={() => changeExpenseDay(1)}
                  disabled={isToday}
                  accessibilityLabel="Next day"
                >
                  <Text style={[styles.dateArrow, isToday && { color: COLORS.border }]}>›</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>AMOUNT (₹)</Text>
              <TextInput
                style={[styles.input, { fontSize: 22 }]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.text3}
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Swiggy dinner"
                placeholderTextColor={COLORS.text3}
                value={desc}
                onChangeText={setDesc}
              />

              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.pills}>
                {Object.keys(CAT_META).map(c => {
                  const meta = CAT_META[c];
                  const selected = cat === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.pill, selected && { backgroundColor: meta.bg, borderColor: meta.fg }]}
                      onPress={() => { setCat(c); setSub(''); }}
                    >
                      <Text style={[styles.pillText, selected && { color: meta.fg }]}>{meta.pill}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {cat !== '' && (
                <View style={styles.subcats}>
                  {SUBCATS[cat].map(s => (
                    <TouchableOpacity key={s} style={[styles.subcat, sub === s && styles.subcatSelected]} onPress={() => setSub(s)}>
                      <Text style={[styles.subcatText, sub === s && { color: COLORS.text }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>PAID BY</Text>
              <View style={styles.pills}>
                {['Me','Wife','Joint'].map(w => (
                  <TouchableOpacity key={w} style={[styles.pill, who === w && { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent }]} onPress={() => setWho(w)}>
                    <Text style={[styles.pillText, who === w && { color: COLORS.accent }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save to Google Sheet</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 20, color: COLORS.text2 },
  monthTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text3, letterSpacing: 0.8 },
  totalAmt: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  summary: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  summaryLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  summaryAmt: { fontSize: 13, fontWeight: '600' },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text2, marginBottom: 5 },
  emptySub: { fontSize: 13, color: COLORS.text3 },
  dayGroup: { marginBottom: 16, paddingHorizontal: 14 },
  dayLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: COLORS.text3, marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  item: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 2 },
  itemMeta: { fontSize: 11, color: COLORS.text3 },
  itemAmt: { fontSize: 14, fontWeight: '600' },
  addBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: COLORS.accent, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 28, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  addBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, maxHeight: '90%', flexShrink: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 14 },
  modalBody: { paddingBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.text2, letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.bg, marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.bg, marginBottom: 10, overflow: 'hidden' },
  dateArrowBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  dateArrowDisabled: { opacity: 0.3 },
  dateArrow: { fontSize: 22, color: COLORS.text2 },
  dateText: { fontSize: 14, fontWeight: '500', color: COLORS.text, textAlign: 'center', flex: 1 },
  pills: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: { flex: 1, padding: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface2, alignItems: 'center' },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.text2 },
  subcats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  subcat: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  subcatSelected: { borderColor: COLORS.text2, backgroundColor: COLORS.surface },
  subcatText: { fontSize: 12, color: COLORS.text2 },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  cancelText: { textAlign: 'center', color: COLORS.text3, fontSize: 14, marginTop: 12 },
});
