import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { searchAPI, feedAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / 2;

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_META = {
  all: { emoji: '✨', label: 'All', gradient: ['#6B63F5', '#9B89FA'] },
  food: { emoji: '🍽️', label: 'Food', gradient: ['#f43f5e', '#fb7185'] },
  travel: { emoji: '✈️', label: 'Travel', gradient: ['#0ea5e9', '#38bdf8'] },
  film: { emoji: '🎬', label: 'Film', gradient: ['#8b5cf6', '#a78bfa'] },
  music: { emoji: '🎵', label: 'Music', gradient: ['#a855f7', '#c084fc'] },
  books: { emoji: '📚', label: 'Books', gradient: ['#6366f1', '#818cf8'] },
  fitness: { emoji: '💪', label: 'Fitness', gradient: ['#10b981', '#34d399'] },
  tech: { emoji: '💻', label: 'Tech', gradient: ['#64748b', '#94a3b8'] },
  games: { emoji: '🎮', label: 'Games', gradient: ['#f59e0b', '#fbbf24'] },
  wellness: { emoji: '🧘', label: 'Wellness', gradient: ['#ec4899', '#f472b6'] },
  art: { emoji: '🎨', label: 'Art', gradient: ['#06b6d4', '#22d3ee'] },
  coffee: { emoji: '☕', label: 'Coffee', gradient: ['#92400e', '#b45309'] },
};

function getCategoryMeta(name) {
  if (!name) return CATEGORY_META.all;
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_META)) {
    if (lower.includes(key)) return CATEGORY_META[key];
  }
  return { emoji: '📌', label: name, gradient: ['#6B63F5', '#9B89FA'] };
}

// ─── Single grid card (full-bleed gradient) ───────────────────────────────────
function DiscoverCard({ item, onPress, colors, isDark }) {
  const meta = getCategoryMeta(item.category?.name || item.category);
  const friendsCount = item.friends_count ?? item.saves_count ?? 0;
  const rating = item.rating ? Number(item.rating).toFixed(1) : null;
  const hasSubtitle = Boolean(item.author || item.location || item.user?.username);
  const separator = item.author && item.location ? ' · ' : '';
  const locationPart = item.location ? `${separator}${item.location}` : '';
  const subtitle = hasSubtitle ? `${item.author || ''}${locationPart}` : null;
  const [c1] = meta.gradient;

  const scrimBg = isDark ? 'rgba(15, 15, 26, 0.95)' : 'rgba(255, 255, 255, 1)';
  const badgeBg = isDark ? 'rgba(30, 30, 46, 0.92)' : 'rgba(255, 255, 255, 0.92)';
  const emptyStarColor = isDark ? '#4b5563' : '#d1d5db';
  const subtitleColor = isDark ? colors.textSecondary : 'rgba(183, 183, 183, 0.78)';

  return (
    <TouchableOpacity style={cardStyles.wrapper} onPress={onPress} activeOpacity={0.85}>
      {/* ── Base gradient colour ── */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />

      {/* ── Category badge ── */}
      <View style={[cardStyles.categoryBadge, { backgroundColor: badgeBg }]}>
        <Text style={cardStyles.categoryEmoji}>{meta.emoji}</Text>
        <Text style={cardStyles.categoryLabel}>{item.category?.name || meta.label}</Text>
      </View>

      {/* ── Bottom scrim so text is always readable ── */}
      <View style={[cardStyles.scrim, { backgroundColor: scrimBg }]}>
        <Text style={[cardStyles.title, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        {subtitle ? (
          <Text style={[cardStyles.subtitle, { color: subtitleColor }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        <View style={cardStyles.meta}>
          {rating ? (
            <View style={cardStyles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name="star"
                  size={11}
                  color={star <= rating ? '#ffd700' : emptyStarColor}
                />
              ))}
            </View>
          ) : null}

          {friendsCount > -1 ? (
            <Text style={[cardStyles.friendsText, { color: subtitleColor }]}>{friendsCount} friends</Text>
          ) : null}
        </View>
      </View>

    </TouchableOpacity>
  );
}

const CARD_HEIGHT = CARD_WIDTH * 1.28;

const cardStyles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
  },

  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.40,
    padding: 12,
  },

  /* content */
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryEmoji: { fontSize: 11 },
  categoryLabel: { color: '#fc8b45ff', fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 13,
    paddingBottom: 14,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: 'center',
    marginTop: 8,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  friendsText: {
    fontSize: 11, fontWeight: '500',
  },
});

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, emoji, active, onPress, colors, isDark }) {
  return (
    <TouchableOpacity
      style={[
        pillStyles.pill,
        active
          ? { backgroundColor: colors.primary }
          : { backgroundColor: isDark ? colors.cardBackground : '#f1f5f9', borderColor: colors.border, borderWidth: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {emoji ? <Text style={pillStyles.emoji}>{emoji}</Text> : null}
      <Text style={[pillStyles.label, { color: active ? '#fff' : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 5,
  },
  emoji: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600' },
});

// ─── Dummy interest data (shown when API returns nothing) ─────────────────────
const DUMMY_CARDS = [
  { id: 'd1', title: 'Sushi Nakazawa', author: 'New York', location: '$$$$ ', category: { name: 'Food' }, rating: 4.8, friends_count: 12 },
  { id: 'd2', title: 'Atomic Habits', author: 'James Clear', category: { name: 'Books' }, rating: 4.9, friends_count: 47 },
  { id: 'd3', title: 'Kyoto, Japan', author: 'Spring · Cherry Blossoms', category: { name: 'Travel' }, rating: 5, friends_count: 89 },
  { id: 'd4', title: 'Circles — Mac Miller', author: 'Album · Hip-hop', category: { name: 'Music' }, rating: 4.8, friends_count: 23 },
  { id: 'd5', title: 'Dune: Part Two', author: 'Denis Villeneuve', category: { name: 'Film' }, rating: 4.9, friends_count: 61 },
  { id: 'd6', title: 'Blue Bottle Coffee', author: 'Oakland, CA', category: { name: 'Coffee' }, rating: 4.7, friends_count: 18 },
  { id: 'd7', title: 'After Hours', author: 'The Weeknd', category: { name: 'Music' }, rating: 4.8, friends_count: 41 },
  { id: 'd8', title: 'Headspace', author: 'Meditation App', category: { name: 'Wellness' }, rating: 4.5, friends_count: 29 },
  { id: 'd9', title: 'Atom Gym', author: 'Brooklyn, NY', category: { name: 'Fitness' }, rating: 4.7, friends_count: 19 },
  { id: 'd10', title: 'The Midnight Library', author: 'Matt Haig', category: { name: 'Books' }, rating: 4.9, friends_count: 34 },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DiscoverScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [cards, setCards] = useState(DUMMY_CARDS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Build filter list from API categories + "All"
  const filterPills = [
    { key: 'all', ...CATEGORY_META.all },
    ...categories.map(c => ({ key: c.slug || c.name.toLowerCase(), ...getCategoryMeta(c.name), label: c.name })),
  ];

  useEffect(() => {
    loadCategories();
    loadDiscover();
  }, []);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await searchAPI.getCategories();
      if (res.success) setCategories(res.data.categories || []);
    } catch (e) {
      console.error('loadCategories:', e);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadDiscover = async () => {
    setLoading(true);
    try {
      const res = await feedAPI.getFeed(1);
      if (res.success) {
        const items = res.data?.preferences || [];
        if (items.length > 0) setCards(items);
      }
    } catch (e) {
      console.error('loadDiscover:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscover();
    setRefreshing(false);
  };

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setLoading(true);
    try {
      const res = await searchAPI.search(q);
      if (res.success) {
        const prefs = res.data?.preferences || [];
        const users = (res.data?.users || []).map(u => ({
          id: `u-${u.id}`, title: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
          author: `@${u.username}`, category: { name: 'People' }, _isUser: true, _user: u,
        }));
        setSearchResults([...prefs, ...users]);
      }
    } catch (e) {
      console.error('handleSearch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Filtered cards
  const displayCards = (() => {
    const source = searchResults ?? cards;
    if (activeFilter === 'all') return source;
    return source.filter(c => {
      const name = (c.category?.name || c.category || '').toLowerCase();
      return name.includes(activeFilter.toLowerCase()) || activeFilter === name;
    });
  })();

  // Build pairs for two-column grid
  const pairs = [];
  for (let i = 0; i < displayCards.length; i += 2) {
    pairs.push([displayCards[i], displayCards[i + 1] || null]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Discover</Text>
      </View>

      {/* ── Search bar ── */}
      <View style={[styles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#f1f5f9' }]}>
        <Icon name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search preferences, people, places..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter pills (horizontal scroll) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
        scrollEnabled={!categoriesLoading}
      >
        {categoriesLoading
          ? [80, 60, 72, 55, 68, 64].map((w, i) => (
            <View
              key={`skel-${w}-${i}`}
              style={[styles.pillSkeleton, { width: w, backgroundColor: isDark ? colors.cardBackground : '#e5e7eb' }]}
            />
          ))
          : filterPills.map(p => (
            <FilterPill
              key={p.key}
              label={p.label}
              emoji={p.emoji}
              active={activeFilter === p.key}
              onPress={() => setActiveFilter(p.key)}
              colors={colors}
              isDark={isDark}
            />
          ))
        }
      </ScrollView>

      {/* ── Grid ── */}
      {loading && !refreshing ? (
        <Loading fullScreen />
      ) : (
        <FlatList
          data={pairs}
          style={[styles.flatList, { backgroundColor: colors.background }]}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item: [left, right] }) => (
            <View style={styles.row}>
              <DiscoverCard
                item={left}
                colors={colors}
                isDark={isDark}
                onPress={() => {
                  if (left._isUser) navigation.navigate('UserProfile', { username: left._user.username });
                  else navigation.navigate('PreferenceDetail', { id: left.id });
                }}
              />
              {right ? (
                <DiscoverCard
                  item={right}
                  colors={colors}
                  isDark={isDark}
                  onPress={() => {
                    if (right._isUser) navigation.navigate('UserProfile', { username: right._user.username });
                    else navigation.navigate('PreferenceDetail', { id: right.id });
                  }}
                />
              ) : (
                <View style={{ width: CARD_WIDTH }} />
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nothing found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try a different search.' : 'No preferences yet in this category.'}
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
  flatList: {},

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },

  pillsScroll: { height: 50, marginVertical: 8, },
  pillsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  pillSkeleton: { height: 36, borderRadius: 24 },

  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: 0,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
