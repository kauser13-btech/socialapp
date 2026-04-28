import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { collectionsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

export default function CollectionDetailScreen({ route, navigation }) {
  const { collection: initialCollection } = route.params;
  const { colors, isDark } = useTheme();
  const [collection, setCollection] = useState(initialCollection);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { loadDetail(); }, [])
  );

  const loadDetail = async () => {
    try {
      const res = await collectionsAPI.get(collection.id);
      if (res.success) {
        setCollection(res.data.collection);
        setPreferences(res.data.preferences || []);
      }
    } catch (e) {
      console.error('Load collection detail error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (preference) => {
    Alert.alert(
      'Remove from Collection',
      `Remove "${preference.title}" from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await collectionsAPI.removePreference(collection.id, preference.id);
              setPreferences(prev => prev.filter(p => p.id !== preference.id));
              setCollection(prev => ({ ...prev, preferences_count: Math.max(0, (prev.preferences_count || 1) - 1) }));
            } catch (e) {
              Alert.alert('Error', 'Failed to remove preference.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.preferenceWrap}>
      <PreferenceCard preference={item} onUpdate={loadDetail} />
      <TouchableOpacity
        style={[styles.removeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => handleRemove(item)}
        activeOpacity={0.7}
      >
        <Icon name="trash-outline" size={15} color="#ef4444" />
        <Text style={styles.removeBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{collection.emoji || '📁'}</Text>
          <View>
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>{collection.name}</Text>
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
              {preferences.length} {preferences.length === 1 ? 'preference' : 'preferences'}
            </Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Description */}
      {collection.description ? (
        <View style={[styles.descBanner, { backgroundColor: isDark ? colors.cardBackground : '#f9fafb' }]}>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>{collection.description}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={preferences}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{collection.emoji || '📁'}</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Collection is empty</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Long-press any preference and tap "Add to Collection"
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, justifyContent: 'center' },
  headerEmoji: { fontSize: 28 },
  headerName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, maxWidth: 180 },
  headerCount: { fontSize: fontSize.xs, marginTop: 2 },
  descBanner: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  descText: { fontSize: fontSize.sm, lineHeight: 20 },
  loader: { marginTop: 60 },
  list: { padding: spacing.md, paddingBottom: 40 },
  preferenceWrap: { marginBottom: spacing.xs },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.full, borderWidth: 1 },
  removeBtnText: { fontSize: fontSize.xs, color: '#ef4444', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
