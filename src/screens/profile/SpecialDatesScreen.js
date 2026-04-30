import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { specialDatesAPI } from '../../lib/api';

const DATE_TYPES = [
  { key: 'birthday',    label: 'Birthday',    emoji: '🎂', color: '#f97316' },
  { key: 'anniversary', label: 'Anniversary', emoji: '💍', color: '#8b5cf6' },
  { key: 'holiday',     label: 'Holiday',     emoji: '🎉', color: '#10b981' },
  { key: 'other',       label: 'Other',       emoji: '📅', color: '#0ea5e9' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getTypeMeta(type) {
  return DATE_TYPES.find(t => t.key === type) || DATE_TYPES[3];
}

function formatDate(month, day) {
  if (!month || !day) return '';
  return `${MONTHS[Number(month) - 1]} ${day}`;
}

function daysUntil(month, day) {
  const now = new Date();
  const year = now.getFullYear();
  let next = new Date(year, Number(month) - 1, Number(day));
  if (next < now) next = new Date(year + 1, Number(month) - 1, Number(day));
  const diff = Math.round((next - now) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function AddModal({ visible, onClose, onSave, colors, isDark }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('birthday');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setType('birthday'); setMonth(''); setDay(''); };

  const handleSave = async () => {
    if (!name.trim() || !month || !day) {
      Alert.alert('Missing fields', 'Please fill in name, month, and day.');
      return;
    }
    const m = Number(month); const d = Number(day);
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert('Invalid date', 'Enter a valid month (1-12) and day (1-31).');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, month: m, day: d });
      reset();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
        <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[modalStyles.cancel, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[modalStyles.title, { color: colors.textPrimary }]}>Add Special Date</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[modalStyles.save, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>NAME</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.textPrimary, backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border }]}
            placeholder="e.g. Mom's Birthday"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>TYPE</Text>
          <View style={modalStyles.typeRow}>
            {DATE_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[
                  modalStyles.typeChip,
                  { backgroundColor: type === t.key ? t.color : (isDark ? colors.cardBackground : '#f3f4f6') },
                ]}
                onPress={() => setType(t.key)}
                activeOpacity={0.75}
              >
                <Text style={modalStyles.typeEmoji}>{t.emoji}</Text>
                <Text style={[modalStyles.typeLabel, { color: type === t.key ? '#fff' : colors.textPrimary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>DATE</Text>
          <View style={modalStyles.dateRow}>
            <TextInput
              style={[modalStyles.dateInput, { color: colors.textPrimary, backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border }]}
              placeholder="Month (1-12)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
              value={month}
              onChangeText={setMonth}
            />
            <Text style={[modalStyles.dateSep, { color: colors.textSecondary }]}>/</Text>
            <TextInput
              style={[modalStyles.dateInput, { color: colors.textPrimary, backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border }]}
              placeholder="Day (1-31)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
              value={day}
              onChangeText={setDay}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SpecialDatesScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await specialDatesAPI.list();
      setDates(Array.isArray(res?.data?.special_dates ?? res?.data) ? (res?.data?.special_dates ?? res?.data) : []);
    } catch {
      setDates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAdd = async (data) => {
    const res = await specialDatesAPI.create(data);
    const newDate = res?.data?.special_date || res?.data;
    if (newDate) setDates(prev => [newDate, ...prev]);
    else await load();
  };

  const handleDelete = (item) => {
    Alert.alert('Remove Date', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await specialDatesAPI.delete(item.id);
            setDates(prev => prev.filter(d => d.id !== item.id));
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to remove.');
          }
        },
      },
    ]);
  };

  const upcomingCount = dates.filter(d => {
    const now = new Date();
    const year = now.getFullYear();
    let next = new Date(year, Number(d.month) - 1, Number(d.day));
    if (next < now) next = new Date(year + 1, Number(d.month) - 1, Number(d.day));
    return Math.round((next - now) / (1000 * 60 * 60 * 24)) <= 30;
  }).length;

  const sorted = [...dates].sort((a, b) => {
    const now = new Date();
    const year = now.getFullYear();
    const nextA = new Date(year, Number(a.month) - 1, Number(a.day));
    const nextB = new Date(year, Number(b.month) - 1, Number(b.day));
    const da = nextA < now ? new Date(year + 1, Number(a.month) - 1, Number(a.day)) : nextA;
    const db = nextB < now ? new Date(year + 1, Number(b.month) - 1, Number(b.day)) : nextB;
    return da - db;
  });

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Special Dates</Text>
          {upcomingCount > 0 && (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {upcomingCount} upcoming in 30 days
            </Text>
          )}
        </View>
        <TouchableOpacity style={[styles.addBtnHeader, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? null : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎂</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No special dates yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add birthdays, anniversaries, and other important dates.
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <Icon name="add-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Add a Date</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sorted.map((item) => {
            const meta = getTypeMeta(item.type);
            const countdown = daysUntil(item.month, item.day);
            const isToday = countdown === 'Today!';
            const isSoon = !isToday && countdown !== 'Tomorrow' && Number(countdown.replace(/\D/g, '')) <= 7;

            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
                  <Text style={styles.iconEmoji}>{meta.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                    {meta.label} · {formatDate(item.month, item.day)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[
                    styles.countdownBadge,
                    { backgroundColor: isToday ? '#ef4444' : isSoon ? meta.color : colors.border + '80' },
                  ]}>
                    <Text style={[styles.countdownText, { color: isToday || isSoon ? '#fff' : colors.textSecondary }]}>
                      {countdown}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
        colors={colors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtnHeader: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardDate: { fontSize: 13 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  countdownBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  countdownText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 2 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  save: { fontSize: 16, fontWeight: '700' },
  body: { padding: 20, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, textAlign: 'center',
  },
  dateSep: { fontSize: 20, fontWeight: '300' },
});
