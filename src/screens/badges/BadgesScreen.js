import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { analyticsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = ['All', 'Creator', 'Social', 'Engagement', 'Curator', 'Dedication'];

// ─── Single badge tile ────────────────────────────────────────────────────────
function BadgeTile({ badge, colors, isDark }) {
  const earned = badge.earned;
  const bg = isDark ? colors.cardBackground : '#fff';

  return (
    <View style={[
      styles.tile,
      { backgroundColor: bg, borderColor: earned ? badge.color + '60' : colors.border },
      earned && { shadowColor: badge.color, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    ]}>
      {/* Icon */}
      <View style={[
        styles.iconWrap,
        { backgroundColor: earned ? badge.color + '20' : colors.border + '40' },
      ]}>
        <Text style={[styles.emoji, { opacity: earned ? 1 : 0.35 }]}>{badge.icon}</Text>
      </View>

      {/* Locked overlay icon */}
      {!earned && (
        <View style={styles.lockOverlay}>
          <Icon name="lock-closed" size={11} color={colors.textTertiary} />
        </View>
      )}

      {/* Name */}
      <Text
        style={[styles.tileName, { color: earned ? colors.textPrimary : colors.textTertiary }]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {/* Progress bar for unearned */}
      {!earned && badge.progress > 0 && (
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${badge.progress}%`, backgroundColor: badge.color }]} />
        </View>
      )}

      {/* Earned checkmark */}
      {earned && (
        <View style={[styles.earnedBadge, { backgroundColor: badge.color }]}>
          <Icon name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BadgesScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [badges, setBadges]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [earnedCount, setEarnedCount] = useState(0);
  const [totalCount, setTotalCount]   = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async ({ isRefresh = false } = {}) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await analyticsAPI.getBadges();
      if (res.success) {
        setBadges(res.data.badges || []);
        setEarnedCount(res.data.earned_count ?? 0);
        setTotalCount(res.data.total_count ?? 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const visible = activeCategory === 'All'
    ? badges
    : badges.filter(b => b.category === activeCategory);

  // Earned first, then locked
  const sorted = [
    ...visible.filter(b => b.earned),
    ...visible.filter(b => !b.earned),
  ];

  if (loading) return <Loading fullScreen />;

  const pct = totalCount > 0 ? Math.round(earnedCount / totalCount * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Badges</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {earnedCount} / {totalCount} earned
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Overall progress bar */}
      <View style={[styles.overallProgress, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc' }]}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>Overall Progress</Text>
          <Text style={[styles.progressPct, { color: colors.primary }]}>{pct}%</Text>
        </View>
        <View style={[styles.progressTrackFull, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFillFull, { width: `${pct}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load({ isRefresh: true }); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <FlatList
            data={CATEGORIES}
            horizontal
            keyExtractor={c => c}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
            renderItem={({ item: cat }) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  style={[styles.catChip, {
                    backgroundColor: active ? colors.primary : isDark ? colors.cardBackground : '#f1f5f9',
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        }
        renderItem={({ item }) => (
          <BadgeTile badge={item} colors={colors} isDark={isDark} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No badges in this category</Text>
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

  overallProgress: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressPct: { fontSize: 13, fontWeight: '700' },
  progressTrackFull: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFillFull: { height: 6, borderRadius: 3 },

  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catChipText: { fontSize: 13, fontWeight: '600' },

  grid: { paddingHorizontal: 12, paddingBottom: 40 },

  tile: {
    flex: 1,
    margin: 5,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  lockOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tileName: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  progressTrack: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  earnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
