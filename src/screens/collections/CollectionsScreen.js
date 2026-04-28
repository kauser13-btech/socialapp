import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { collectionsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const EMOJI_OPTIONS = ['📁', '❤️', '⭐', '🍕', '🎬', '✈️', '🎵', '📚', '🏋️', '🎮', '☕', '🌍'];

export default function CollectionsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', emoji: '📁', is_public: false });

  useFocusEffect(
    useCallback(() => { loadCollections(); }, [])
  );

  const loadCollections = async () => {
    try {
      const res = await collectionsAPI.list();
      if (res.success) setCollections(res.data.collections || []);
    } catch (e) {
      console.error('Load collections error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', description: '', emoji: '📁', is_public: false });
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter a collection name.');
      return;
    }
    setSaving(true);
    try {
      const res = await collectionsAPI.create(form);
      if (res.success) {
        setCollections(prev => [res.data.collection, ...prev]);
        setModalVisible(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create collection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (collection) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${collection.name}"? Preferences inside won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await collectionsAPI.delete(collection.id);
              setCollections(prev => prev.filter(c => c.id !== collection.id));
            } catch (e) {
              Alert.alert('Error', 'Failed to delete collection.');
            }
          },
        },
      ]
    );
  };

  const renderCollection = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}
      onPress={() => navigation.navigate('CollectionDetail', { collection: item })}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.emojiWrap, { backgroundColor: colors.primary + '18' }]}>
        <Text style={styles.emoji}>{item.emoji || '📁'}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          <Icon name="bookmark-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
            {item.preferences_count || 0} {item.preferences_count === 1 ? 'preference' : 'preferences'}
          </Text>
          {item.is_public && (
            <View style={[styles.publicBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.publicText, { color: colors.primary }]}>Public</Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Collections</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openCreate}
          activeOpacity={0.8}
        >
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={collections}
          renderItem={renderCollection}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📁</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No collections yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap + to create your first collection
              </Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Collection</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Emoji picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, form.emoji === e && { backgroundColor: colors.primary + '25', borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => setForm(f => ({ ...f, emoji: e }))}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', color: colors.textPrimary }]}
              placeholder="e.g. Date Night Spots"
              placeholderTextColor={colors.textSecondary}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              maxLength={100}
            />

            {/* Description */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', color: colors.textPrimary }]}
              placeholder="What's this collection about?"
              placeholderTextColor={colors.textSecondary}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              maxLength={255}
            />

            {/* Public toggle */}
            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: colors.border }]}
              onPress={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
              activeOpacity={0.7}
            >
              <View>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Make Public</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Others can view this collection</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: form.is_public ? colors.primary : colors.border }]}>
                <View style={[styles.toggleThumb, { transform: [{ translateX: form.is_public ? 20 : 2 }] }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.createBtnText}>Create Collection</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: 60 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
  emojiWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: 2 },
  cardDesc: { fontSize: fontSize.sm, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCount: { fontSize: fontSize.xs },
  publicBadge: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  publicText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emojiBtnText: { fontSize: 22 },
  input: { borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, marginBottom: spacing.md },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.lg },
  toggleLabel: { fontSize: fontSize.md, fontWeight: '600' },
  toggleSub: { fontSize: fontSize.xs, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  createBtn: { height: 52, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
