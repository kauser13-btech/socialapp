import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { allergiesAPI } from '../../lib/api';

const SEVERITY_LEVELS = [
  { key: 'severe',   label: 'Severe',   color: '#ef4444', bg: '#FFF0F0', icon: 'warning' },
  { key: 'moderate', label: 'Moderate', color: '#f59e0b', bg: '#FFFBEB', icon: 'warning' },
  { key: 'mild',     label: 'Mild',     color: '#a16207', bg: '#FEFCE8', icon: null      },
];

const COMMON_ALLERGENS = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy',
  'Fish', 'Shellfish', 'Sesame', 'Gluten', 'Lactose',
];

function getSeverityMeta(severity) {
  return SEVERITY_LEVELS.find(s => s.key === severity) || SEVERITY_LEVELS[2];
}

function AddModal({ visible, onClose, onSave, colors, isDark }) {
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setSeverity('mild'); setNotes(''); };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter the allergy or intolerance name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), severity, notes: notes.trim() || undefined });
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
          <Text style={[modalStyles.title, { color: colors.textPrimary }]}>Add Allergy</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[modalStyles.save, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>ALLERGEN NAME</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.textPrimary, backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border }]}
            placeholder="e.g. Peanuts, Gluten, Dairy…"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>COMMON ALLERGENS</Text>
          <View style={modalStyles.tagsRow}>
            {COMMON_ALLERGENS.map(a => (
              <TouchableOpacity
                key={a}
                style={[
                  modalStyles.tag,
                  { backgroundColor: name === a ? colors.primary : (isDark ? colors.cardBackground : '#f3f4f6') },
                ]}
                onPress={() => setName(a)}
                activeOpacity={0.75}
              >
                <Text style={[modalStyles.tagText, { color: name === a ? '#fff' : colors.textPrimary }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>SEVERITY</Text>
          <View style={modalStyles.severityRow}>
            {SEVERITY_LEVELS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[
                  modalStyles.severityChip,
                  { backgroundColor: severity === s.key ? s.color : (isDark ? colors.cardBackground : '#f3f4f6') },
                ]}
                onPress={() => setSeverity(s.key)}
                activeOpacity={0.75}
              >
                {s.icon && (
                  <Icon name={s.icon} size={14} color={severity === s.key ? '#fff' : s.color} />
                )}
                <Text style={[modalStyles.severityLabel, { color: severity === s.key ? '#fff' : colors.textPrimary }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.notesInput, { color: colors.textPrimary, backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border }]}
            placeholder="Any additional details…"
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AllergiesScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await allergiesAPI.list();
      const data = res?.data?.allergies ?? res?.data;
      setAllergies(Array.isArray(data) ? data : []);
    } catch {
      setAllergies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAdd = async (data) => {
    const res = await allergiesAPI.create(data);
    const newItem = res?.data?.allergy || res?.data;
    if (newItem && newItem.id) setAllergies(prev => [newItem, ...prev]);
    else await load();
  };

  const handleDelete = (item) => {
    Alert.alert('Remove Allergy', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await allergiesAPI.delete(item.id);
            setAllergies(prev => prev.filter(a => a.id !== item.id));
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to remove.');
          }
        },
      },
    ]);
  };

  const severeCount = allergies.filter(a => a.severity === 'severe').length;

  const grouped = SEVERITY_LEVELS.map(s => ({
    ...s,
    items: allergies.filter(a => (a.severity || 'mild') === s.key),
  })).filter(g => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Allergies & Intolerances</Text>
          {allergies.length > 0 && (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {allergies.length} item{allergies.length !== 1 ? 's' : ''}
              {severeCount > 0 ? ` · ${severeCount} severe` : ''}
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
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1a2235' : '#EFF6FF', borderColor: '#3b82f620' }]}>
          <Icon name="information-circle-outline" size={18} color="#3b82f6" />
          <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
            This info is shown when friends gift food or make restaurant recommendations.
          </Text>
        </View>

        {loading ? null : allergies.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: '#FFF0F0' }]}>
              <Icon name="warning-outline" size={36} color="#ef4444" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No allergies added</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add any food allergies or intolerances so friends can plan accordingly.
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <Icon name="add-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Allergy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key} style={styles.group}>
              <View style={[styles.groupHeader, { backgroundColor: group.bg }]}>
                {group.icon && <Icon name={group.icon} size={14} color={group.color} />}
                <Text style={[styles.groupLabel, { color: group.color }]}>
                  {group.label.toUpperCase()} · {group.items.length}
                </Text>
              </View>
              {group.items.map(item => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: group.color + '30' }]}
                >
                  <View style={[styles.dot, { backgroundColor: group.color }]} />
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                    {!!item.notes && (
                      <Text style={[styles.cardNotes, { color: colors.textSecondary }]}>{item.notes}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 16 },

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

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  group: { gap: 8 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    alignSelf: 'flex-start',
  },
  groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1,
    gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardNotes: { fontSize: 13, lineHeight: 18 },
  deleteBtn: { padding: 2 },

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
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
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  tagText: { fontSize: 14, fontWeight: '500' },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 12,
  },
  severityLabel: { fontSize: 14, fontWeight: '600' },
});
