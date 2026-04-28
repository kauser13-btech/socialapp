import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { feedAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const RATING_FILTERS = [
  { label: 'All (4+)', value: 4 },
  { label: '⭐⭐⭐⭐⭐  5 stars', value: 5 },
  { label: '⭐⭐⭐⭐  4+ stars', value: 4 },
];

function StarRating({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Icon
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

export default function TopRatedScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [minRating, setMinRating]     = useState(4);

  useFocusEffect(useCallback(() => { load(); }, [minRating]));

  const load = async ({ isRefresh = false } = {}) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await feedAPI.getTopRated(minRating);
      if (res.success) setPreferences(res.data.preferences || []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); load({ isRefresh: true }); };

  const fiveStarCount = preferences.filter(p => p.rating === 5).length;

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Top Rated</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {preferences.length} preferences · {fiveStarCount} perfect scores
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Rating filter chips */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {RATING_FILTERS.map(f => {
            const active = minRating === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : isDark ? colors.cardBackground : '#f1f5f9',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setMinRating(f.value); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={preferences}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        renderItem={({ item, index }) => (
          <View>
            {/* Rank badge row above card */}
            <View style={styles.rankRow}>
              <View style={[
                styles.rankBadge,
                { backgroundColor: index < 3 ? '#f59e0b' : colors.primary + '18' },
              ]}>
                <Text style={[styles.rankText, { color: index < 3 ? '#fff' : colors.primary }]}>
                  #{index + 1}
                </Text>
              </View>
              <StarRating rating={item.rating} />
            </View>
            <PreferenceCard preference={item} onUpdate={load} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="star-outline" size={52} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No top-rated preferences</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Preferences with {minRating}+ star ratings will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },

  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rankText: { fontSize: 12, fontWeight: '800' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, color: '#94a3b8' },
});
