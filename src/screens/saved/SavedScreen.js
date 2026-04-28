import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { preferencesAPI, searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Category visual config: name keyword → emoji, bg gradient, text color
const CATEGORY_CONFIG = [
  { keys: ['food', 'drink', 'dining', 'restaurant'], emoji: '🍽️', bg: '#FFF3E8', accent: '#f97316', label: 'Food & Drinks' },
  { keys: ['travel', 'trip', 'flight'],              emoji: '✈️', bg: '#E6F6FF', accent: '#0ea5e9', label: 'Travel' },
  { keys: ['entertainment', 'movie', 'film', 'tv'],  emoji: '🎬', bg: '#F0EDFF', accent: '#7c3aed', label: 'Entertainment' },
  { keys: ['fashion', 'style', 'clothing'],          emoji: '👗', bg: '#FFF0F7', accent: '#ec4899', label: 'Fashion' },
  { keys: ['fitness', 'sport', 'gym', 'health'],     emoji: '💪', bg: '#E8FFF5', accent: '#10b981', label: 'Fitness' },
  { keys: ['tech', 'technology', 'gadget'],          emoji: '💻', bg: '#EFF6FF', accent: '#3b82f6', label: 'Technology' },
  { keys: ['book', 'read', 'literature'],            emoji: '📚', bg: '#FFFBEB', accent: '#f59e0b', label: 'Books' },
  { keys: ['music', 'concert', 'song'],              emoji: '🎵', bg: '#F5F0FF', accent: '#8b5cf6', label: 'Music' },
  { keys: ['game', 'gaming'],                        emoji: '🎮', bg: '#FFF0E8', accent: '#f97316', label: 'Gaming' },
];

function getCategoryConfig(name) {
  if (!name) return { emoji: '📁', bg: '#F3F4F6', accent: '#6b7280', label: name || 'General' };
  const lower = name.toLowerCase();
  const match = CATEGORY_CONFIG.find(({ keys }) => keys.some(k => lower.includes(k)));
  return match
    ? { ...match, label: name }
    : { emoji: '📁', bg: '#F3F4F6', accent: '#6b7280', label: name };
}

export default function SavedScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [categories, setCategories]       = useState([]);
  const [preferences, setPreferences]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const preferencesCount = preferences.length;
  const categoriesCount  = categories.length;
  const friendsCount     = user?.friends_count ?? 0;

  const load = useCallback(async () => {
    try {
      const [savedRes, catsRes] = await Promise.allSettled([
        preferencesAPI.getSaved(),
        searchAPI.getCategories(),
      ]);

      if (savedRes.status === 'fulfilled' && savedRes.value.success) {
        const prefs = savedRes.value.data?.preferences || [];
        setPreferences(prefs);

        // Build categories from saved preferences
        const catMap = {};
        prefs.forEach((p) => {
          if (p.category) {
            const id = p.category.id || p.category.name;
            if (!catMap[id]) {
              catMap[id] = { ...p.category, count: 0, isPrivate: false };
            }
            catMap[id].count += 1;
            if (p.is_private) catMap[id].isPrivate = true;
          }
        });
        setCategories(Object.values(catMap));
      }

      if (catsRes.status === 'fulfilled' && catsRes.value.success) {
        const apiCats = catsRes.value.data?.categories || [];
        if (apiCats.length > 0) {
          // Merge with count info derived from preferences
          setCategories((prev) => {
            const byName = {};
            prev.forEach(c => { byName[c.name?.toLowerCase()] = c; });
            return apiCats.map(c => ({
              ...c,
              count: byName[c.name?.toLowerCase()]?.count || c.preferences_count || 0,
              isPrivate: byName[c.name?.toLowerCase()]?.isPrivate || false,
            }));
          });
        }
      }
    } catch (e) {
      console.error('Error loading preferences:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Loading fullScreen />;

  const renderCategoryCard = ({ item, index }) => {
    const cfg = getCategoryConfig(item.name);
    const isLeft = index % 2 === 0;
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          {
            backgroundColor: isDark ? colors.cardBackground : cfg.bg,
            marginLeft: isLeft ? 0 : 8,
          },
        ]}
        onPress={() => navigation.navigate('CategoryScreen', { category: item })}
        activeOpacity={0.82}
      >
        {item.isPrivate && (
          <View style={styles.lockBadge}>
            <Icon name="lock-closed" size={12} color="#92400e" />
          </View>
        )}
        <View style={[styles.categoryEmojiWrap, { backgroundColor: cfg.accent + '22' }]}>
          <Text style={styles.categoryEmoji}>{cfg.emoji}</Text>
        </View>
        <Text style={[styles.categoryName, { color: isDark ? colors.textPrimary : '#1a1a2e' }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.categoryCount, { color: item.isPrivate ? '#f59e0b' : cfg.accent }]}>
          {item.count} item{item.count === 1 ? '' : 's'}
          {item.isPrivate ? ' · Private' : ''}
        </Text>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#f4f5fa' }]}
      edges={['left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Purple Hero Header ── */}
        <View style={styles.heroSection}>
          {/* Decorative circles */}
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>My Preferences</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('PreferenceCreate')}
              activeOpacity={0.85}
            >
              <Icon name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => {}} activeOpacity={0.75}>
              <Text style={styles.statCount}>{preferencesCount}</Text>
              <Text style={styles.statLabel}>Preferences</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('CategoryScreen')}
              activeOpacity={0.75}
            >
              <Text style={styles.statCount}>{categoriesCount}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('Tabs', { screen: 'FriendsTab' })}
              activeOpacity={0.75}
            >
              <Text style={styles.statCount}>{friendsCount}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Category Grid ── */}
        <View style={styles.gridSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textPrimary : '#1a1a2e' }]}>
            Browse by Category
          </Text>

          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Icon name="folder-open-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No categories yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add preferences to see them grouped by category here.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('PreferenceCreate')}
                activeOpacity={0.8}
              >
                <Icon name="add-outline" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Add a Preference</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => (item.id ?? item.name).toString()}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: '#5B4CF5',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  heroBubble1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -40,
  },
  heroBubble2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: -30,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  gridSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    gap: 8,
    marginBottom: 0,
  },

  // ── Category Card ────────────────────────────────────────────────────────────
  categoryCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 16,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Empty ────────────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
