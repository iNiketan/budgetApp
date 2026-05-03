import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, MONTHS, SUBCATS } from '../constants';
import { saveExpense } from '../api';

const CAT_ICONS = {
  '🏠 Rent':'🏠','🛒 Groceries':'🛒','⚡ Utilities':'⚡','🚗 Transport':'🚗',
  '💊 Medical':'💊','📱 Phone/Net':'📱','🏫 School fees':'🏫',
  '🍕 Dining out':'🍕','🎬 Movies':'🎬','🛍️ Shopping':'🛍️','✈️ Travel':'✈️',
  '🎮 Games':'🎮','☕ Coffee':'☕','💇 Salon':'💇',
  '📈 SIP / MF':'📈','🏦 FD / RD':'🏦','🚨 Emergency fund':'🚨',
  '🏡 Home goal':'🏡','🎓 Education fund':'🎓',
};

function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function ExpensesScreen({ expenses, onRefresh, onAdd }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [who, setWho] = useState('Me');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = expenses.filter(e => e.month === month && e.year === year);
  let needs = 0, wants = 0, sav = 0;
  filtered.forEach(e => {
    if (e.cat === 'needs') needs += e.amount;
    else if (e.cat === 'wants') wants += e.amount;
    else sav += e.amount;
  });

  function changeMonth(d) {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
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

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Enter a valid amount'); return; }
    if (!cat) { Alert.alert('Select a category'); return; }
    setSaving(true);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const entry = {
      date: dateStr,
      description: desc || sub || cat,
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      subcategory: sub,
      amount: parseFloat(amount),
      paidBy: who,
      month,
      year,
    };
    try {
      await saveExpense(entry);
      onAdd({ ...entry, desc: entry.description, cat, subcat: sub, who, month, year });
      setModal(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'Could not save. Check your internet connection.');
    }
    setSaving(false);
  }

  function resetForm() {
    setAmount(''); setDesc(''); setCat(''); setSub(''); setWho('Me');
  }

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
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
            <Text style={[styles.summaryAmt, { color: COLORS.savings }]}>{fmt(sav)}</Text>
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
              const icon = e.subcat ? (CAT_ICONS[e.subcat] || '💸') : (e.cat === 'needs' ? '🏠' : e.cat === 'wants' ? '🎉' : '💰');
              const catBg = e.cat === 'needs' ? COLORS.needsBg : e.cat === 'wants' ? COLORS.wantsBg : COLORS.savingsBg;
              const amtColor = e.cat === 'needs' ? COLORS.needs : e.cat === 'wants' ? COLORS.wants : COLORS.savings;
              return (
                <View key={i} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: catBg }]}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{e.desc || e.subcat || e.cat}</Text>
                    <Text style={styles.itemMeta}>
                      {e.cat.charAt(0).toUpperCase() + e.cat.slice(1)}
                      {e.who !== 'Me' ? `  ·  ${e.who}` : ''}
                      {`  ·  ${e.date}`}
                    </Text>
                  </View>
                  <Text style={[styles.itemAmt, { color: amtColor }]}>{fmt(e.amount)}</Text>
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
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => { setModal(false); resetForm(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Expense</Text>

            <Text style={styles.label}>AMOUNT (₹)</Text>
            <TextInput style={[styles.input, { fontSize: 22 }]} keyboardType="numeric" placeholder="0" value={amount} onChangeText={setAmount} />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput style={styles.input} placeholder="e.g. Swiggy dinner" value={desc} onChangeText={setDesc} />

            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.pills}>
              {['needs','wants','savings'].map(c => (
                <TouchableOpacity key={c} style={[styles.pill, cat === c && { backgroundColor: c === 'needs' ? COLORS.needsBg : c === 'wants' ? COLORS.wantsBg : COLORS.savingsBg, borderColor: c === 'needs' ? COLORS.needs : c === 'wants' ? COLORS.wants : COLORS.savings }]} onPress={() => { setCat(c); setSub(''); }}>
                  <Text style={[styles.pillText, cat === c && { color: c === 'needs' ? COLORS.needs : c === 'wants' ? COLORS.wants : COLORS.savings }]}>
                    {c === 'needs' ? '🏠 Needs' : c === 'wants' ? '🎉 Wants' : '💰 Savings'}
                  </Text>
                </TouchableOpacity>
              ))}
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

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save to Google Sheet</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModal(false); resetForm(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.text2, letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.bg, marginBottom: 10 },
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
